# --- Build Stage ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client & Build Next.js app
RUN npx prisma generate
RUN npm run build

# --- Production Stage ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application and required assets
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
