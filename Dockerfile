# Stage 1: Build React frontend
FROM node:18-alpine AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ ./
RUN npm run build

# Stage 2: Build Express backend and final image
FROM node:18-alpine

WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server source
COPY src/ ./src/

# Copy built frontend from stage 1
COPY --from=client-builder /app/client/build ./public

# Create /config directory for volume mount
RUN mkdir -p /config

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7160
ENV DB_PATH=/config/habits.db
ENV JWT_SECRET_FILE=/config/jwt_secret.txt

# Expose port
EXPOSE 7160

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:7160/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "src/server.js"]
