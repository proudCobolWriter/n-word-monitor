FROM node:17

# Working directory
WORKDIR /usr/src/n-word-monitor

# Copy package json files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy src files
COPY . .

# Env variables
ENV NODE_ENV=production
ENV DOCKER_RUNNING=true

# Expose the web server port
EXPOSE $HOST_PORT

# Run the bot
CMD [ "node", "." ]