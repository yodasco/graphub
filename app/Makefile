run:
	meteor --settings settings-local.json

deploy:
	cp settings-prod.json settings.json
	mup deploy
	rm settings.json