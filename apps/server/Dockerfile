# Multi-Stage Dockerfile for LFPS Core API (Go 1.23)
# Produces an ultra-lightweight ~15MB production container

FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install git and build dependencies
RUN apk add --no-cache git

# Copy dependency manifests
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server cmd/api/main.go

# Production Runner Stage
FROM alpine:3.20

WORKDIR /app

# Install ca-certificates for secure outbound connections
RUN apk add --no-cache ca-certificates tzdata

# Create data directory for backups and state
RUN mkdir -p /app/data/backups

# Copy binary from builder
COPY --from=builder /app/server /app/server

ENV PORT=8080
ENV DATA_DIR=/app/data

EXPOSE 8080

CMD ["/app/server"]
