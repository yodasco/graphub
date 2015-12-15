#!/bin/bash

source venv/bin/activate

for f in $(ls test-data)
do
  cmd="python import.py --stars --pulls --pushes --members --forks --file  "test-data/$f" --log --drop"
  echo "$cmd"
  $cmd
done
