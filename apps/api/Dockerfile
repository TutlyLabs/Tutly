# Use a Node.js base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy all the files from the monorepo
COPY . .

# Install and enable pnpm
RUN corepack enable
RUN corepack prepare pnpm@10.6.3 --activate

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the API service
RUN pnpm turbo build --filter=@tutly/api...

# Expose the port the API will run on
EXPOSE 3001

# Set the command to start the application
CMD ["node", "apps/api/dist/index.js"] 