# Builds the console with Node, then serves the static files with nginx.
# VITE_* variables are baked into the bundle at build time, so pass them as build args.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_BASE_URL=""
ARG VITE_CSRF_COOKIE="csrf_token"
ARG VITE_STOREFRONT_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_CSRF_COOKIE=$VITE_CSRF_COOKIE \
    VITE_STOREFRONT_URL=$VITE_STOREFRONT_URL \
    VITE_API_MOCKS=false
RUN npm run build

FROM nginx:1.29-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Single-page app: unknown paths fall back to index.html so client-side routes survive a reload.
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  location / { try_files $uri /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
