# syntax=docker/dockerfile:1.7
# Production image for the API (server, sweeper, migrate and seed entry points). `pnpm deploy`
# copies the built dist/ with the API's production dependencies; workspace packages are bundled.
# Build:  docker build -t quartermaster-api .
# Run:    docker run --env-file .env -p 4000:4000 quartermaster-api

FROM node:26-bookworm-slim@sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68 AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY apps/api/package.json apps/api/
COPY apps/mcp/package.json apps/mcp/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY packages/integrations/package.json packages/integrations/
COPY packages/payments/package.json packages/payments/
COPY packages/quartermaster/package.json packages/quartermaster/
COPY packages/trustrail/package.json packages/trustrail/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @qm/api build \
 && pnpm --filter @qm/api deploy --prod --legacy /out \
 && cp -r packages/database/migrations /out/migrations

FROM node:26-bookworm-slim@sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68
ENV NODE_ENV=production QM_MIGRATIONS_DIR=/app/migrations
WORKDIR /app
# The application files stay owned by root and read-only to the runtime user, so a compromised
# process cannot rewrite its own code or migrations. Nothing under /app is written at runtime.
COPY --from=build /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
