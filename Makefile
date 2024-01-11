backup:
	docker run --rm --volumes-from bot -v ${pwd}/backup:/backup ubuntu tar cvf /backup/backup.tar /usr/local/apps/n-word-monitor/