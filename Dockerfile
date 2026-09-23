FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    CODEX_USAGE_DATA_DIR=/data
WORKDIR /app
RUN useradd --create-home --uid 10001 dashboard && mkdir /data && chown dashboard:dashboard /data
COPY --from=builder --chown=dashboard:dashboard /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=dashboard:dashboard /app/node_modules ./node_modules
COPY --from=builder --chown=dashboard:dashboard /app/.next ./.next
USER dashboard
EXPOSE 3000
CMD ["npm", "start", "--", "--hostname", "0.0.0.0"]
