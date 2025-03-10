# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies - modified to work better in Docker context
RUN npm install && \
    cd client && npm install && \
    cd ../server && npm install

# Copy source code
COPY . .

# Build client and server
RUN npm run build

# Final stage
FROM caddy:2-alpine

# Install Node.js
RUN apk add --no-cache nodejs npm

# Create app directory
WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/client/dist /app/client
COPY --from=builder /app/server/dist /app/server
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

# Expose ports
EXPOSE 80 443

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV CLIENT_PATH=/app/client
ENV USE_HTTPS=false
ENV DOMAIN=0.0.0.0

# Start the application
ENTRYPOINT ["/app/docker-entrypoint.sh"]