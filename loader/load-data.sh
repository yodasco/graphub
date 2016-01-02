source v/bin/activate

nohup python loader.py --cont --stars --forks --pulls --pushes --members >>nohup.out 2>&1 &
