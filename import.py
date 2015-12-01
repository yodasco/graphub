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

def create_repository(event):
  print "==== create_repository not implemented yet" + event

def handle_member(event):
  print event['type']
  # print json.dumps(event, indent=2)
  payload = event['payload']
  if payload['action'] == 'added':
    member = payload['member']
    print 'Member', member['id'], member['login']
    member_node = graph.merge_one('User', 'id', member['id'])
    member_node.properties['login'] = member['login']

    repo = event['repo']
    print 'Repository', repo['id'], repo['name']
    repo_node = graph.merge_one('Repository', 'id', repo['id'])
    repo_node.properties['full_name'] = repo['name']

    actor = event['actor']
    print 'Owner', actor['id'], actor['login']
    actor_node = graph.merge_one('User', 'id', actor['id'])
    actor_node.properties['login'] = actor['login']

    graph.create_unique(Relationship(member_node, "MEMBER", repo_node))
    graph.create_unique(Relationship(actor_node, "MEMBER", repo_node))
    graph.create_unique(Relationship(actor_node, "ADMIN", repo_node))

    graph.push(repo_node, member_node, actor_node)


def handle_pull_request(event):
  payload = event['payload']
  pull_request = payload['pull_request']
  if (payload['action'] == 'closed' and pull_request['merged'] == True):
    print event['type']
    repo = pull_request['base']['repo']
    print 'Repository', repo['id'], repo['full_name']
    repo_node = graph.merge_one("Repository", "id", repo['id'])
    repo_node.properties['full_name'] = repo['full_name']

    contributor = pull_request['user']
    if contributor is not None:
      print 'Contributor', contributor['id'], contributor['login']
      contributor_node = graph.merge_one("User", "id", contributor['id'])
      contributor_node.properties['login'] = contributor['login']

      graph.create_unique(Relationship(contributor_node, "CONTRIBUTED", repo_node))

    if contributor is None:
      graph.push(repo_node)
    else:
      graph.push(repo_node, contributor_node)


main(args.file);
