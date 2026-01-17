# Dockerfile for Drawing App DSL Generator

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create directories for mounted volumes
RUN mkdir -p /app/examples /app/generated

# Set entrypoint
ENTRYPOINT ["node", "dist/cli/index.js"]
CMD ["--help"]
