# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install && \
    cd client && npm install && \
    cd ../server && npm install

# Copy source code
COPY . .

# Build client and server
RUN npm run build

# Final stage
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/client/dist /app/client/dist
COPY --from=builder /app/server/dist /app/server/dist
COPY --from=builder /app/server/package.json /app/server/

# Install production dependencies for server
WORKDIR /app/server
RUN npm install --omit=dev

# Create data directory
RUN mkdir -p /etc/cf-dns-batch

# Copy entrypoint script
WORKDIR /app
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Expose port
EXPOSE 80

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80
ENV CLIENT_PATH=/app/client/dist

# Start the application
ENTRYPOINT ["/app/docker-entrypoint.sh"]