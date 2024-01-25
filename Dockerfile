# Rust compilation stage
FROM ghcr.io/napi-rs/napi-rs/nodejs-rust:lts-debian as buildrs

# Working directory
WORKDIR /src

# Copy package json files
COPY ./rusty/package*.json ./

# Install dependencies
RUN npm install

# Copy the files from the rusty folder
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

# Copy all the files
COPY . .

# Remove the prebuild rusty folder and copy the rusty folder after it has been built in the buildrs stage
RUN rm -Rf ./rusty

COPY --from=buildrs /src/ ./rusty

# Healthcheck
RUN apt update && apt install curl -y \
        && rm -rf /var/lib/apt/lists/*

# Env variables
ENV DOCKER_RUNNING=true

# Run the bot
CMD [ "node", "." ]