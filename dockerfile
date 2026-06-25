# Backend — Node/Express + Prisma
FROM node:22-bookworm-slim

# Prisma needs openssl at runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (cached unless lockfile changes)
COPY package*.json ./
RUN npm ci

# Generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Application source
COPY src ./src

EXPOSE 3000

# Apply committed migrations, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
