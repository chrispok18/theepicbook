# ---------- Stage 1: dependency stage ----------
FROM node:20-alpine AS deps
WORKDIR /app
# Copy only the package files first, so this layer is cached
# and only re-runs when dependencies change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Stage 2: minimal runtime stage ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Bring in production dependencies only, owned by the non-root user
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
# Run as the built-in non-root "node" user, not root
USER node
# Internal backend port only (never published to the host)
EXPOSE 8080
# Production startup command
CMD ["node", "server.js"]
