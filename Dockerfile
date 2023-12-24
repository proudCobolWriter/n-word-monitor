FROM node:17

# Working directory
WORKDIR /usr/src/n-word-monitor

# Copy package json files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy src files
COPY . .

# Healthcheck
RUN apt update && apt install curl -y \
        && rm -rf /var/lib/apt/lists/*

HEALTHCHECK --interval=10s --timeout=30s --retries=3 CMD curl --fail http://localhost:3000 || exit 1

# Env variables
ENV DOCKER_RUNNING=true

# Expose the web server port
EXPOSE $HOST_PORT

# Run the bot
CMD [ "node", "." ]