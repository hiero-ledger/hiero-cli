# Build stage
FROM node:21@sha256:4b232062fa976e3a966c49e9b6279efa56c8d207a67270868f51b3d155c4e33d AS build-stage
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:21-slim@sha256:dfc05dee209a1d7adf2ef189bd97396daad4e97c6eaa85778d6f75205ba1b0fb AS production-stage
WORKDIR /app

# Set CI environment variable to skip Husky setup
ENV CI=true

# Copy package.json and package-lock.json for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the built code from the build stage
COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Copy the entrypoint script
RUN chmod +x docker-entrypoint.sh

# Define the command to run the application
# CMD [ "node", "dist/hiero-cli.js" ]

# Define the entrypoint script: Hang until the container is stopped
ENTRYPOINT [ "./docker-entrypoint.sh" ]