# Startup sequence
git clean  -d  -f .
git fetch
git pull
npm install
NODE_ENV=production node .