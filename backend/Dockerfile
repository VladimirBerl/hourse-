# Backend Dockerfile
FROM node:18-slim

# Install build dependencies for native modules (bcrypt)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create directories for uploads and data
RUN mkdir -p uploads data

# Expose port
EXPOSE 3001

# Start server (init-db will run automatically on first start via server.ts)
CMD ["npm", "start"]

