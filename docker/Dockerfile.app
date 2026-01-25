# Dockerfile for Generated Application

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build if there's a build script
RUN npm run build || true

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install production dependencies
RUN npm ci --production

# Copy Prisma Client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built files or source files
COPY --from=builder /app/dist ./dist 2>/dev/null || COPY --from=builder /app/*.ts ./
COPY --from=builder /app/routes ./routes 2>/dev/null || true
COPY --from=builder /app/controllers ./controllers 2>/dev/null || true
COPY --from=builder /app/middleware ./middleware 2>/dev/null || true

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
