# --- Stage 1: Build the React Application ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package requirements
COPY package*.json ./

# Install project dependencies
RUN npm ci

# Copy all source files
COPY . .

# Declare environment variable build arg
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the React production distribution bundle
RUN npm run build

# --- Stage 2: Serve using Nginx Web Server ---
FROM nginx:alpine

# Copy nginx config file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to nginx public directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
