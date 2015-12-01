import gzip
import argparse
import json
from py2neo import Graph
from py2neo import Node, Relationship

parser = argparse.ArgumentParser()
parser.add_argument('--file', help='File to import', required=True)
parser.add_argument('--drop', help='Drop data first?', action='store_true')
parser.set_defaults(drop=False)
args = parser.parse_args()

graph = Graph()
# graph.schema.create_uniqueness_constraint("Repository", "id")
# graph.schema.create_uniqueness_constraint("User", "id")

if args.drop:
  print '!!! DROPPING DATABASE !!!'
  graph.delete_all();

def main(file_name):

  with gzip.open(file_name, 'rb') as f:
    for line in f.readlines():
      event = json.loads(line)
      if event['type'] == 'RepositoryEvent':
        create_repository(event)
      if event['type'] == 'PullRequestEvent':
        handle_pull_request(event)
      if event['type'] == 'MemberEvent':
        handle_member(event)
      if event['type'] == 'WatchEvent':
        handle_watch(event)

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


main(args.file);
