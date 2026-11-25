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
RUN mkdir -p /config && chown node:node /config
VOLUME /config

ENV NODE_ENV=production
ENV PORT=7160
ENV DB_PATH=/config/habits.db

EXPOSE 7160

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:7160/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/server.js"]
