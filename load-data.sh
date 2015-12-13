source venv/bin/activate

nohup python import.py --cont --pulls --pushes --members >>nohup.out 2>&1 &
