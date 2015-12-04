import gzip
import argparse
import json
import datetime
import urllib2
import StringIO
from py2neo import Graph
from py2neo import Node, Relationship
from functools import wraps
from time import time

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
parser.add_argument('--watches', help='Handle watches (stars)?', action='store_true')
parser.add_argument('--cont', help='Continue download from last place?', action='store_true')
parser.add_argument('--download_from_date',
                    help='Start download from date. format YYYY-MM-DD',
                    type=valid_date)
parser.add_argument('--log', help='Log verbose?', action='store_true')

args = parser.parse_args()


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
      print e
      continue
    funcs = {
      'RepositoryEvent': create_repository,
      'PullRequestEvent': handle_pull_request,
      'MemberEvent': handle_member,
      'ForkEvent': handle_fork,
      'WatchEvent': handle_watch,
      'PushEvent': handle_push,
    }
    # Check out optional event hanlers
    if not args.forks:
      del funcs['ForkEvent']
    if not args.watches:
      del funcs['WatchEvent']

    func = funcs.get(event['type'])
    if func:
      func(event)

def get_user_login(user):
  return user if type(user) == unicode else user['login']

USERS = dict()
def add_user(user):
  login = get_user_login(user)
  user_node = USERS.get(login)
  if user_node is None:
    user_node = graph.merge_one('User', 'login', login)
    USERS[login] = user_node
  return user_node

def get_user(login):
  return USERS.get(login) or graph.find_one('User', 'login', login)

def get_repo_full_name(repo):
  return repo['full_name'] if 'full_name' in repo else repo['name']

REPOS = dict()
def add_repo(repo):
  full_name = get_repo_full_name(repo)
  repo_node = REPOS.get(full_name)
  if repo_node is None:
    repo_node = graph.merge_one('Repository', 'full_name', full_name)
    REPOS[full_name] = repo_node
  return repo_node

CONTRIBUTORS = set()
def add_contributor(user_data, repo_data):
  key = get_user_login(user_data) + '-' + get_repo_full_name(repo_data)
  if key in CONTRIBUTORS:
    return
  CONTRIBUTORS.add(key)
  user = add_user(user_data)
  repo = add_repo(repo_data)
  graph.create_unique(Relationship(user, "CONTRIBUTOR", repo))

MEMBERS = set()
def add_member(user_data, repo_data):
  key = get_user_login(user_data) + '-' + get_repo_full_name(repo_data)
  if key in MEMBERS:
    return
  MEMBERS.add(key)
  user = add_user(user_data)
  repo = add_repo(repo_data)
  graph.create_unique(Relationship(user, "MEMBER", repo))

def log(event):
  if args.log:
    print event['type'], event.get('id'), event['created_at']

def create_repository(event):
  print "==== create_repository not implemented yet" + event

def handle_fork(event):
  # print json.dumps(event, indent=2)
  payload = event['payload']
  log(event)
  if type(payload['forkee']) == int:
    handle_fork_legacy(event)
  else:
    repo = add_repo(event['repo'])
    add_contributor(payload['forkee']['owner'], payload['forkee'])
    forkee = add_repo(payload['forkee'])
    graph.create_unique(Relationship(forkee, "FORKED", repo))

def handle_fork_legacy(event):
  print "handle_fork_legacy not implemented yet"

def handle_watch(event):
  # print json.dumps(event, indent=2)
  payload = event['payload']
  if payload['action'] == 'started':
    log(event)
    actor = add_user(event['actor'])
    repo = add_repo(event['repo'])
    graph.create_unique(Relationship(actor, "WATCHES", repo))

def handle_member(event):
  payload = event['payload']
  if payload['action'] == 'added':
    log(event)
    # print json.dumps(event, indent=2)
    repo_name = event.get('repo') or event.get('repository')
    if repo_name != '/':
      add_member(payload['member'], repo_name)
      if 'login' in event['actor']:
        add_member(event['actor'], repo_name)

def handle_push(event):
  log(event)
  add_contributor(event['actor'], event['repo'])

def handle_pull_request(event):
  payload = event['payload']
  legacy_api =  type(payload.get('actor')) == unicode
  if legacy_api:
    handle_pull_request_legacy(event)
  else:
    pull_request = payload['pull_request']
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
    yield h.strftime('%Y-%m-%d-') + '{0:d}'.format(h.hour)
    h += datetime.timedelta(hours=1)

def download_and_load_hour(hour_string):
  file_name = 'http://data.githubarchive.org/%s.json.gz' % hour_string
  response = urllib2.urlopen(file_name)
  if response.code != 200:
    print "Error downloading the file " + file_name
  else:
    compressed_file = StringIO.StringIO()
    compressed_file.write(response.read())
    compressed_file.seek(0)
    load_from_buffer(compressed_file)

def load_from_date(date):
  for h in generate_hours(date, datetime.datetime.today()):
    print "=== Loading:  ", h
    download_and_load_hour(h)
    status = graph.merge_one('ProcessingStatus', 'last_processed_date',
                             'last_processed_date')
    status.properties['date'] = h
    status.push()

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

graph = Graph()

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
  else:
    date = datetime.datetime(2011, 2, 12)

  load_from_date(date)
