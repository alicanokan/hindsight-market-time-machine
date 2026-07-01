# HINDSIGHT — zero-dependency Node app. Runs on any container host.
FROM node:22-alpine
WORKDIR /app

# No dependencies to install; copy the whole app.
COPY . .

ENV NODE_ENV=production
ENV PORT=4321
EXPOSE 4321

# Simple healthcheck hitting the built-in endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz || exit 1

CMD ["node", "server.js"]
