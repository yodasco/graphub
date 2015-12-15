run-app:
	cd app; meteor --settings settings-local.json

deploy-app:
	cd app; \
	cp settings-prod.json settings.json; \
	mup deploy; \
	rm settings.json;

deploy-loader:
	cd loader; scp {loader.py,load-data.sh} neo4j.us-east-1.aws.yodas.com:/home/ubuntu/graphub/
