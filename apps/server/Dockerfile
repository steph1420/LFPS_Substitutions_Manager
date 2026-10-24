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

# ca-certificates for outbound HTTPS (Google Sheets, Bundle 35). Time-zone data is embedded
# in the binary (time/tzdata), so no tzdata package is needed.
RUN apk add --no-cache ca-certificates

# Copy binary from builder
COPY --from=builder /app/server /app/server

# Stateless relay (Bundle 34): no data directory or disk is needed.
# The school time zone defaults to Asia/Kolkata in code; override with APP_TZ (or TZ) only
# if the school moves. Set ALLOWED_ORIGINS if the web app is served from elsewhere.
ENV PORT=8080

EXPOSE 8080

CMD ["/app/server"]

