FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json* turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm install

FROM deps AS builder
ARG APP_NAME=web
RUN npm run build --workspace @semear/${APP_NAME}

FROM base AS runner
ARG APP_NAME=web
ENV APP_NAME=${APP_NAME}
COPY --from=builder /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=builder /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=builder /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public
EXPOSE 3000
CMD ["sh", "-c", "node apps/$APP_NAME/server.js"]
