# Rust compilation stage
FROM rust:slim-buster as buildrs

# Get NPM
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y nodejs \
    npm

# Working directory
WORKDIR /src

# Copy package json files
COPY ./rusty/package*.json ./

# Install dependencies
RUN npm install

# Copy src files
COPY ./rusty .

# Build the rust bot part
RUN npm run build



# Node stage
FROM node:17

# Working directory
WORKDIR /usr/src/n-word-monitor

# Copy package json files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy src files
COPY . .
COPY --from=buildrs /src/ /usr/src/n-word-monitor/rusty

# Healthcheck
RUN apt update && apt install curl -y \
        && rm -rf /var/lib/apt/lists/*

# Env variables
ENV DOCKER_RUNNING=true

# Run the bot
CMD [ "node", "." ]