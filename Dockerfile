# Build stage
FROM node:22.23.4 AS build-stage
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies exactly as locked
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22.23.4-slim AS production-stage
WORKDIR /app

# Set CI environment variable to skip Husky setup
ENV CI=true

# Copy package.json and package-lock.json for production dependencies
COPY package*.json ./

# Install only production dependencies, exactly as locked
RUN npm ci --omit=dev

# Copy the built code from the build stage
COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Copy the entrypoint script
RUN chmod +x docker-entrypoint.sh

# Run as the unprivileged user provided by the Node image
USER node

# Define the command to run the application
# CMD [ "node", "dist/hiero-cli.js" ]

# Define the entrypoint script: Hang until the container is stopped
ENTRYPOINT [ "./docker-entrypoint.sh" ]
