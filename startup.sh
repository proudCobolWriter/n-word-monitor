# Sync the files with the repo
git reset --hard
git fetch
git pull

# Install node_modules in case it is missing
npm install

# Print outdated packages
echo -e "\033[0;31mOUTDATED \033[0mPACKAGES LIST:"
npm outdated

# Startup sequence
NODE_ENV=production node .