# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# Stage 2: Final runtime image
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY . .
COPY .env .env

EXPOSE 8002

CMD ["npm", "start"]
