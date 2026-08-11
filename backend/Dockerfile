# Backend Dockerfile for Banking Leads Management Platform
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package metadata first for optimal Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production || npm install --production

# Copy backend source code and templates
COPY . .

# Create directory for file uploads and generated excel reports
RUN mkdir -p uploads generated

# Expose backend port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start Node server
CMD ["npm", "start"]
