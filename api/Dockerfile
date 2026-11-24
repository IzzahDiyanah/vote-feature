FROM node:22-bookworm-slim

# prisma needs openssl
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# install deps first so docker can cache this layer
# (schema is copied early because npm ci runs prisma generate)
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

# run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
