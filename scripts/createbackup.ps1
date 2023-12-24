# Powershell script that archives the content of the db-data volume
docker run --rm --volumes-from bot -v ${pwd}/backup:/backup ubuntu tar cvf /backup/backup.tar /usr/local/apps/n-word-monitor/