# Stage 1: Build React frontend
FROM node:24-alpine AS client-builder

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build Express backend and final image
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

COPY --from=client-builder /app/client/dist ./public

# /config is the only writable path. Declaring it as a VOLUME means
# `docker run --read-only` gets a writable anonymous volume when none is mounted.
RUN mkdir -p /config /app/data && chown node:node /config /app/data
VOLUME /config

# Start as root, fix /config ownership, then drop to the node user (see the script
# for the backwards-compatibility rules). Keeps root-owned data from older versions working.
RUN apk add --no-cache su-exec
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=7160
ENV DB_PATH=/config/habits.db

EXPOSE 7160

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:7160/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
