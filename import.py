import gzip
import argparse
import json
import datetime
import urllib2
import StringIO
from py2neo import Graph
from py2neo import Node, Relationship

parser = argparse.ArgumentParser()
parser.add_argument('--drop', help='Drop data first?', action='store_true')
parser.add_argument('--file', help='File to import')
parser.add_argument('--forks', help='Handle forks?', action='store_true')
parser.add_argument('--watches', help='Handle watches (stars)?', action='store_true')
parser.set_defaults(drop=False)
args = parser.parse_args()

graph = Graph()
try:
  graph.schema.create_uniqueness_constraint("Repository", "full_name")
except:
  pass
try:
  graph.schema.create_uniqueness_constraint("User", "login")
except:
  pass
try:
  graph.schema.create_uniqueness_constraint("PullRequest", "id")
except:
  pass

if args.drop:
  print '!!! DROPPING DATABASE !!!'
  graph.delete_all();

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
    }
    # Check out optional event hanlers
    if not args.forks:
      del funcs['ForkEvent']
    if not args.watches:
      del funcs['WatchEvent']

    func = funcs.get(event['type'])
    if func:
      func(event)

def add_user(user):
  if type(user) == unicode:
    login = user
  else:
    login = user['login']
  return graph.merge_one('User', 'login', login)

def get_user(login):
  return graph.find_one('User', 'login', login)

def add_repo(repo):
  name = repo['full_name'] if 'full_name' in repo else repo['name']
  return graph.merge_one('Repository', 'full_name', name)

def log(event):
  print event['type'], event['id'], event['created_at']

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
    forkee = add_repo(payload['forkee'])
    forkee_owner = add_user(payload['forkee']['owner'])
    graph.create_unique(Relationship(forkee_owner, "CONTRIBUTED", forkee))
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
    member = add_user(payload['member'])
    repo = add_repo(event['repo'])
    actor = add_user(event['actor'])
    graph.create_unique(Relationship(member, "MEMBER", repo))
    graph.create_unique(Relationship(actor, "MEMBER", repo))


def handle_pull_request(event):
  payload = event['payload']
  legacy_api = type(payload['actor']) == unicode
  if legacy_api:
    handle_pull_request_legacy(event)
  else:
    actor = event['actor']
    pull_request = payload['pull_request']
    if (payload['action'] == 'closed' and pull_request.get('merged') == True):
      # print json.dumps(event, indent=2)
      log(event)
      repo = add_repo(pull_request['base']['repo'])

      contributor = pull_request['user']
      if contributor is not None:
        contributor = add_user(contributor)
        graph.create_unique(Relationship(contributor, "CONTRIBUTED", repo))

      actor = add_user(actor)
      graph.create_unique(Relationship(actor, "MEMBER", repo))

def handle_pull_request_legacy(event):
  payload = event['payload']
  actor = event['actor']
  pr_id = '%s/pulls/%s' % (event['repo']['name'], payload['number'])
  if payload['action'] == 'opened':
    pr = graph.merge_one('PullRequest', 'id', pr_id)
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
        graph.create_unique(Relationship(contributor, "CONTRIBUTED", repo))

    actor = add_user(actor)
    graph.create_unique(Relationship(actor, "MEMBER", repo))

def get_pull_request(pr_id):
  return graph.find_one('PullRequest', 'id', pr_id)

def handle_pull_request_v2(event):
  print json.dumps(event, indent=2)
  payload = event['payload']
  pull_request = payload['pull_request']
  if (payload['action'] == 'closed' and pull_request.get('merged') == True):
    log(event)
    repo = add_repo(pull_request['base']['repo'])

    contributor = pull_request['user']
    if contributor is not None:
      contributor = add_user(contributor)
      graph.create_unique(Relationship(contributor, "CONTRIBUTED", repo))

    actor = add_user(event['actor'])
    graph.create_unique(Relationship(actor, "MEMBER", repo))

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

if args.file:
  load_from_file(args.file)
else:
  load_from_date(datetime.datetime(2015,1,1))
