#!/bin/bash

source venv/bin/activate

for f in $(ls test-data)
do
  cmd="python loader.py --stars --pulls --pushes --members --forks --file  "test-data/$f" --drop"
  echo "$cmd"
  $cmd
done
