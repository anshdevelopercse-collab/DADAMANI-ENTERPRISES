# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create runtime directories for logs and uploaded documents
RUN mkdir -p logs uploads

ENV PORT=5000
EXPOSE 5000

CMD ["node", "dist/server.js"]
