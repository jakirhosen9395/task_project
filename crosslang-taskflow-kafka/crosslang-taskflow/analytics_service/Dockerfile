# Stage 1: Build (Go builder)
FROM golang:1.21-alpine AS builder
WORKDIR /src

RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o analytics main.go

# Stage 2: Final runtime image
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /src/analytics /app/analytics
COPY .env .env

EXPOSE 8003
CMD ["/app/analytics"]
