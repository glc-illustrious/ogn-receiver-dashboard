FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/

RUN npm ci --workspace=packages/shared --workspace=packages/backend

COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/

RUN npx tsc -b packages/shared && npm run build -w packages/backend

FROM node:22-alpine

WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/packages/backend/package.json packages/backend/
COPY --from=builder /app/packages/backend/dist/ packages/backend/dist/
COPY --from=builder /app/node_modules/ node_modules/
COPY --from=builder /app/packages/backend/node_modules/ packages/backend/node_modules/

WORKDIR /app/packages/backend
EXPOSE 3001
CMD ["node", "dist/index.js"]
