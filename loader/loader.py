import gzip
import argparse
import json
import datetime
import urllib2
import os
import StringIO
from py2neo import Graph
from py2neo import Node, Relationship
from functools import wraps
from time import time, sleep
import pylru
import traceback

parser = argparse.ArgumentParser()
def valid_date(s):
  try:
    return datetime.datetime.strptime(s, "%Y-%m-%d")
  except ValueError:
    msg = "Not a valid date: '{0}'.".format(s)
    raise argparse.ArgumentTypeError(msg)
parser.add_argument('--drop', help='Drop data first?', action='store_true', default=False)
parser.add_argument('--file', help='File to import')
parser.add_argument('--forks', help='Handle forks?', action='store_true')
parser.add_argument('--stars', help='Handle stars (stars)?', action='store_true')
parser.add_argument('--pulls', help='Handle pull requests?', action='store_true')
parser.add_argument('--pushes', help='Handle pushes?', action='store_true')
parser.add_argument('--members', help='Handle membership events?', action='store_true')
parser.add_argument('--cont', help='Continue download from last place?', action='store_true')
parser.add_argument('--download_from_date',
                    help='Start download from date. format YYYY-MM-DD',
                    type=valid_date)
parser.add_argument('--log', help='Log verbose?', action='store_true')

args = parser.parse_args()

class Cache(object):
  def __init__(self):
    self.data = pylru.lrucache(50000)
    self.hits = 0
    self.misses = 0

  def get(self, key):
    ret = self.data.get(key)
    if ret:
      self.hits += 1
    else:
      self.misses += 1
    return ret

  def put(self, key, obj):
    self.data[key] = obj

  def get_hit_ratio(self):
    total = self.hits + self.misses
    if total == 0:
      return 0
    return float(self.hits) / total

  def size(self):
    return len(self.data)

def timeit(f):
  @wraps(f)
  def wrap(*args, **kw):
    ts = time()
    result = f(*args, **kw)
    te = time()
    print '%r took: %2.4f sec' % (f.__name__, te-ts)
    return result
  return wrap

def load_from_buffer(buffer):
  with gzip.GzipFile(fileobj=buffer, mode='rb') as f:
    process_file_contents(f)

def load_from_file(file_name):
  if file_name.endswith('.gz'):
    with gzip.open(file_name, 'rb') as f:
      process_file_contents(f)
  else:
    with open(file_name, 'rb') as f:
      process_file_contents(f)

@timeit
def process_file_contents(f):
  line_number = 0
  for line in f.readlines():
    line_number += 1
    try:
      event = json.loads(line)
    except Exception as e:
      print 'Exception processing line %d' % line_number
      traceback.print_exc()
      continue
    funcs = {
      'RepositoryEvent': create_repository,
    }
    # Check out optional event hanlers
    if args.pulls:
      funcs['PullRequestEvent'] = handle_pull_request
    if args.pushes:
      funcs['PushEvent'] = handle_push
    if args.members:
      funcs['MemberEvent'] = handle_member
    if args.forks:
      funcs['ForkEvent'] = handle_fork
    if args.stars:
      funcs['WatchEvent'] = handle_watch

    func = funcs.get(event['type'])
    if func:
      try:
        func(event)
      except Exception as e:
        print "!!!   Error handling event %s " % event
        traceback.print_exc()
  print_cache_stats()

def print_cache_stats():
  print 'USERS cache hit ratio: %f, size: %d' % (USERS.get_hit_ratio(), USERS.size())
  print 'REPOS cache hit ratio: %f, size: %d' % (REPOS.get_hit_ratio(), REPOS.size())
  print 'CONTRIBUTORS cache hit ratio: %f, size: %d' % (CONTRIBUTORS.get_hit_ratio(), CONTRIBUTORS.size())
  print 'MEMBERS cache hit ratio: %f, size: %d' % (MEMBERS.get_hit_ratio(), MEMBERS.size())

def get_user_login(user):
  if type(user) == unicode:
    return user
  if 'login' in user:
    return user['login']

USERS = Cache()
def add_user(user):
  login = get_user_login(user)
  user_node = USERS.get(login)
  if user_node is None:
    user_node = graph.merge_one('User', 'login', login)
    USERS.put(login, user_node)
  add_properties(user_node, user, ['name', 'company', 'location', 'blog',
                 'email', 'gravatar_id', 'type', 'avatar_url', 'html_url',
                 'site_admin'])
  user_node.properties['ghId'] = user.get('id')
  return user_node

def get_user(login):
  return USERS.get(login) or graph.find_one('User', 'login', login)

def get_repo_full_name(repo):
  if type(repo) == unicode:
    return repo
  if 'full_name' in repo:
    return repo['full_name']
  if 'owner' in repo and 'name' in repo:
    owner = repo['owner'] if type(repo['owner']) == unicode else repo['owner']['login']
    return '%s/%s' % (owner, repo['name'])
  return repo['name']

REPOS = Cache()
def add_repo(repo):
  if repo is None:
    return
  full_name = get_repo_full_name(repo)
  if full_name == '/':
    return
  repo_node = REPOS.get(full_name)
  if repo_node is None:
    repo_node = graph.merge_one('Repository', 'full_name', full_name)
    REPOS.put(full_name, repo_node)
  add_properties(repo_node, repo, ['stargazers_count', 'watchers_count',
                 'forks_count', 'language'])
  repo_node.properties['ghId'] = repo.get('id')
  return repo_node

def add_properties(db_node, source_dict, property_names):
  if type(source_dict) == dict:
    modified = False
    for p in property_names:
      v = source_dict.get(p)
      if v:
        db_node.properties[p] = v
        modified = True
    if modified:
      graph.push(db_node)
      # print db_node

CONTRIBUTORS = Cache()
def add_contributor(user_data, repo_data):
  if repo_data and user_data:
    repo_name = get_repo_full_name(repo_data)
    if repo_name == '/':
      return
    key = get_user_login(user_data) + '-' + repo_name
    if CONTRIBUTORS.get(key):
      return
    CONTRIBUTORS.put(key, True)
    user = add_user(user_data)
    repo = add_repo(repo_data)
    graph.create_unique(Relationship(user, "CONTRIBUTOR", repo))

MEMBERS = Cache()
def add_member(user_data, repo_data):
  repo_name = get_repo_full_name(repo_data)
  if repo_name == '/':
    return
  key = get_user_login(user_data) + '-' + repo_name
  if MEMBERS.get(key):
    return
  MEMBERS.put(key, True)
  user = add_user(user_data)
  repo = add_repo(repo_data)
  graph.create_unique(Relationship(user, "MEMBER", repo))

def log(event):
  if args.log:
    print event['type'], event.get('id'), event['created_at']

def create_repository(event):
  print "==== create_repository not implemented yet" + event

def extract_repo_name_from_url(url):
  if url:
    return url[len('https://github.com/'):]

def handle_fork(event):
  # print json.dumps(event, indent=2)
  payload = event['payload']
  log(event)
  repo = add_repo(event.get('repo') or event.get('repository'))
  if type(payload.get('forkee')) == int:
    print ">>> Not handling legacy fork event..."
    return
  fork_repo_dict = payload.get('forkee') or extract_repo_name_from_url(event.get('url'))
  fork_repo = add_repo(fork_repo_dict)
  forker_dict = event.get('actor_attributes') or payload['forkee']['owner']
  add_contributor(forker_dict, fork_repo_dict)
  fork_rel = Relationship(fork_repo, "FORKED", repo)
  fork_rel['created_at'] = event['created_at']
  fork_rel['created_at_long'] = unix_time_millis(event['created_at'])
  graph.create_unique(fork_rel)

epoch = datetime.datetime.utcfromtimestamp(0)
def unix_time_millis(date_str):
  l = len('YYYY-mm-ddTHH:MM:SS')
  date_str = date_str[:l]
  dt = datetime.datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S')
  return (dt - epoch).total_seconds() * 1000.0

def handle_watch(event):
  # print json.dumps(event, indent=2)
  payload = event['payload']
  if payload['action'] == 'started':
    log(event)
    actor = add_user(payload.get('actor') or event.get('actor') or event.get('actor_attributes'))
    repo = add_repo(payload.get('repo') or event.get('repo') or event.get('repository'))
    star_rel = Relationship(actor, "STAR", repo)
    star_rel['created_at'] = event['created_at']
    star_rel['created_at_long'] = unix_time_millis(event['created_at'])
    graph.create_unique(star_rel)

def handle_member(event):
  payload = event['payload']
  if payload['action'] == 'added':
    log(event)
    # print json.dumps(event, indent=2)
    repo = event.get('repo') or event.get('repository')
    add_member(payload['member'], repo)
    if 'login' in event['actor']:
      add_member(event['actor'], repo)

def handle_push(event):
  log(event)
  # print json.dumps(event, indent=2)
  add_contributor(event['actor'], event.get('repo') or event.get('repository'))

def handle_pull_request(event):
  payload = event['payload']
  legacy_api =  type(payload.get('actor')) == unicode
  if legacy_api:
    handle_pull_request_legacy(event)
  else:
    pull_request = payload['pull_request']
    add_repo(pull_request['base']['repo'])
    add_repo(pull_request['head']['repo'])
    if (payload['action'] == 'closed' and pull_request.get('merged') == True):
      # print json.dumps(event, indent=2)
      log(event)

      contributor = pull_request['user']
      if contributor is not None:
        add_contributor(contributor, pull_request['base']['repo'])

      add_member(event['actor'], pull_request['base']['repo'])

def handle_pull_request_legacy(event):
  payload = event['payload']
  actor = event['actor']
  pr_id = '%s/pulls/%s' % (event['repo']['name'], payload['number'])
  if payload['action'] == 'opened':
    pr = graph.merge_one('PullRequest', 'id', pr_id)
    if 'login' in actor:
      puller = add_user(actor)
      pr.properties['puller'] = actor['login']
      graph.push(pr)
  if payload['action'] == 'closed':
    log(event)
    repo = add_repo(event['repo'])
    if repo:
      pr = get_pull_request(pr_id)
      if pr:
        # print json.dumps(event, indent=2)
        contributor = get_user(pr.properties['puller'])
        graph.delete(pr)
        if contributor:
          graph.create_unique(Relationship(contributor, "CONTRIBUTOR", repo))

    if 'login' in actor:
      add_member(actor, event['repo'])

def get_pull_request(pr_id):
  return graph.find_one('PullRequest', 'id', pr_id)

def generate_hours(from_date, until_date):
  h = from_date
  while h < until_date:
    yield h, h.strftime('%Y-%m-%d-') + '{0:d}'.format(h.hour)
    h += datetime.timedelta(hours=1)

def download_and_load_hour(hour_string):
  data = None
  try:
    data = download_hour(hour_string)
  except:
    print '!!! Error downloading file %s' % hour_string
    traceback.print_exc()

  if data:
    compressed_file = StringIO.StringIO()
    compressed_file.write(data)
    compressed_file.seek(0)
    load_from_buffer(compressed_file)
    return True

@timeit
def download_hour(hour_string):
  file_name = 'http://data.githubarchive.org/%s.json.gz' % hour_string
  response = urllib2.urlopen(file_name)
  if response.code != 200:
    print '!!! Error downloading file %s' % file_name
    print 'Response code: %d' % response.code
    return
  else:
    return response.read()

def load_from_date(date):
  while True:
    today = datetime.datetime.today()
    for (time, formatted_time) in generate_hours(date, today):
      print "=== Loading:  ", formatted_time
      loaded = download_and_load_hour(formatted_time)
      if loaded:
        status = graph.merge_one('ProcessingStatus', 'last_processed_date',
                                 'last_processed_date')
        status.properties['date'] = formatted_time
        status.push()
        date = time
    hours_to_sleep = 2
    print 'DONE until today %s   will sleep for %d hours...' % (today, hours_to_sleep)
    sleep(60 * 60 * hours_to_sleep)

def setup_schema():
  def constraint(label, key):
    try:
      graph.schema.create_uniqueness_constraint(label, key)
    except:
      pass
  constraint("Repository", "full_name")
  constraint("User", "login")
  constraint("PullRequest", "id")
  constraint('ProcessingStatus', 'last_processed_date')

graph = Graph(os.environ.get('NEO4J_CONNECTION_STRING'))

if args.drop:
  print '!!! DROPPING DATABASE !!!'
  graph.delete_all();

setup_schema();

if args.file:
  load_from_file(args.file)
if args.download_from_date:
  load_from_date(args.download_from_date)
if args.cont:
  status = graph.find_one('ProcessingStatus')
  if status:
    date = status.properties['date']
    date = datetime.datetime.strptime(date, '%Y-%m-%d-%H')
    date += datetime.timedelta(hours=1)
  else:
    date = datetime.datetime(2011, 2, 12)

  load_from_date(date)
