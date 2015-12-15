#!/bin/bash

source venv/bin/activate

for f in $(ls test-data)
do
  echo "Processing test-data/$f"
  python import.py --stars --pulls --pushes --members --forks --file  "test-data/$f" --drop
done
