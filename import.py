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
parser.add_argument('--forks', help='Handle forks?', action='store_true')
parser.add_argument('--watches', help='Handle watches (stars)?', action='store_true')
parser.set_defaults(drop=False)
args = parser.parse_args()

graph = Graph()
# graph.schema.create_uniqueness_constraint("Repository", "id")
# graph.schema.create_uniqueness_constraint("User", "id")

if args.drop:
  print '!!! DROPPING DATABASE !!!'
  graph.delete_all();

def load_from_buffer(buffer):
  with gzip.GzipFile(fileobj=buffer, mode='rb') as f:
    process_file_contents(f)

def load_from_file(file_name):
  with gzip.open(file_name, 'rb') as f:
    process_file_contents(f)

def process_file_contents(f):
  for line in f.readlines():
    event = json.loads(line)
    funcs = {
      'RepositoryEvent': create_repository,
      'PullRequestEvent': handle_pull_request,
      'MemberEvent': handle_member,
    }
    if args.forks:
      funcs['ForkEvent'] = handle_fork
    if args.watches:
      funcs['WatchEvent'] = handle_watch
    func = funcs.get(event['type'])
    if func:
      func(event)

def add_user(user):
  node = graph.merge_one('User', 'id', user['id'])
  node['login'] = user['login']
  return node

def add_repo(repo):
  node = graph.merge_one('Repository', 'id', repo['id'])
  node['full_name'] = repo['full_name'] if 'full_name' in repo  else repo['name']
  return node

def log(event):
  print event['type'], event['id'], event['created_at']

def create_repository(event):
  print "==== create_repository not implemented yet" + event

def handle_fork(event):
  # print json.dumps(event, indent=2)
  payload = event['payload']
  log(event)
  repo = add_repo(event['repo'])
  forkee = add_repo(payload['forkee'])
  forkee_owner = add_user(payload['forkee']['owner'])
  graph.create_unique(Relationship(forkee_owner, "CONTRIBUTED", forkee))
  graph.create_unique(Relationship(forkee, "FORKED", repo))
  graph.push(repo, forkee, forkee_owner)

def handle_watch(event):
  # print json.dumps(event, indent=2)
  payload = event['payload']
  if payload['action'] == 'started':
    log(event)
    actor = add_user(event['actor'])
    repo = add_repo(event['repo'])
    graph.create_unique(Relationship(actor, "WATCHES", repo))
    graph.push(actor, repo)

def handle_member(event):
  # print json.dumps(event, indent=2)
  payload = event['payload']
  if payload['action'] == 'added':
    log(event)
    member = add_user(payload['member'])
    repo = add_repo(event['repo'])
    actor = add_user(event['actor'])
    graph.create_unique(Relationship(member, "MEMBER", repo))
    graph.create_unique(Relationship(actor, "MEMBER", repo))
    graph.push(repo, member, actor)


def handle_pull_request(event):
  payload = event['payload']
  pull_request = payload['pull_request']
  if (payload['action'] == 'closed' and pull_request['merged'] == True):
    # print json.dumps(event, indent=2)
    log(event)
    repo = add_repo(pull_request['base']['repo'])

    contributor = pull_request['user']
    if contributor is not None:
      contributor = add_user(contributor)
      graph.create_unique(Relationship(contributor, "CONTRIBUTED", repo))

    actor = add_user(event['actor'])
    graph.create_unique(Relationship(actor, "MEMBER", repo))

    if contributor is None:
      graph.push(repo, actor)
    else:
      graph.push(repo, actor, contributor)

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

load_from_date(datetime.datetime(2015,1,1))
