# =============================================================================
# Dockerfile Backend - Phase 3 Docker Booster
# API Node.js pour OSINT Master
# 
# Features:
# - Node.js 20 LTS
# - Multi-stage build
# - Health check
# - Integration avec Docker/Tor
# =============================================================================

FROM node:20-slim AS base

LABEL maintainer="OSINT Master <dev@osint-master.local>"
LABEL version="4.0"
LABEL description="OSINT Master Backend API"

# ═════════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═════════════════════════════════════════════════════════════════════════════

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    # Docker client (pour contrôler les containers)
    docker.io \
    # Network tools
    netcat-traditional \
    dnsutils \
    # Process monitoring
    procps \
    # Clean up
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# ═════════════════════════════════════════════════════════════════════════════
# NODE SETUP
# ═════════════════════════════════════════════════════════════════════════════

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ═════════════════════════════════════════════════════════════════════════════
# APPLICATION
# ═════════════════════════════════════════════════════════════════════════════

# Copy source code
COPY . .

# Create data directories
RUN mkdir -p /app/data /app/logs /app/tmp \
    && chown -R node:node /app

# Switch to non-root user
USER node

# ═════════════════════════════════════════════════════════════════════════════
# EXPOSE & HEALTH CHECK
# ═════════════════════════════════════════════════════════════════════════════

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Start
CMD ["node", "dist/index.js"]
