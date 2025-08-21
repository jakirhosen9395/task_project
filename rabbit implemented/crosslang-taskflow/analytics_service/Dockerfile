# Stage 1: Build
FROM golang:1.21-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o analytics-service .

# Stage 2: Runtime
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/analytics-service .
COPY --from=builder /app/.env . 
EXPOSE 8003
CMD ["./analytics-service"]