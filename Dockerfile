FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json ./
RUN pnpm install

COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN pnpm build

FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist
COPY sql ./sql

ENV API_HOST=0.0.0.0
ENV API_PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]