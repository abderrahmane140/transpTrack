# syntax=docker/dockerfile:1.6

# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first to leverage Docker layer cache
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy source and build
COPY . .

# Vite build arguments (baked into the bundle at build time)
ARG VITE_API_URL=http://localhost:8080
ARG VITE_REVERB_APP_KEY=transport-key
ARG VITE_REVERB_HOST=localhost
ARG VITE_REVERB_PORT=8080
ARG VITE_REVERB_SCHEME=http

ENV VITE_API_URL=$VITE_API_URL \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

RUN npm run build


# ---------- Runtime: Nginx ----------
FROM nginx:1.27-alpine AS runtime

# Replace default site config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
