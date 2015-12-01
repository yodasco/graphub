import gzip
import argparse
import json
from py2neo import Graph
from py2neo import Node, Relationship

parser = argparse.ArgumentParser()
parser.add_argument('--file', help='File to import', required=True)
args = parser.parse_args()

graph = Graph()
# graph.schema.create_uniqueness_constraint("Repository", "id")
# graph.schema.create_uniqueness_constraint("Contributor", "id")
graph.delete_all();

def main(file_name):

  with gzip.open(file_name, 'rb') as f:
    for line in f.readlines():
      event = json.loads(line)
      if event['type'] == 'RepositoryEvent':
        create_repository(event)
      if event['type'] == 'PullRequestEvent':
        handle_pull_request(event);

def create_repository(event):
  print "==== create_repository not implemented yet" + event

def handle_pull_request(event):
  payload = event['payload']
  pull_request = payload['pull_request']
  if (payload['action'] == 'closed' and pull_request['merged'] == True):
    repo = pull_request['base']['repo']
    print repo['id'], repo['full_name']
    repo_node = graph.merge_one("Repository", "id", repo['id'])

    contributor = pull_request['user']
    print 'Contributor', contributor['id'], contributor['login']
    contributor_node = graph.merge_one("Contributor", "id", contributor['id'])

    graph.create_unique(Relationship(contributor_node, "CONTRIBUTED", repo_node))

    repo_node.properties['full_name'] = repo['full_name']
    repo_node.properties['name'] = repo['name']
    contributor_node.properties['login'] = contributor['login']
    contributor_node.properties['name'] = contributor['login']
    graph.push(repo_node, contributor_node)

main(args.file);
