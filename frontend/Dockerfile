# --- build stage ---
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- serve stage ---
FROM nginx:alpine

# ca-certificates so nginx can verify an HTTPS upstream's certificate (needed
# when BACKEND_SCHEME=https, e.g. proxying to a Render backend over the
# public internet rather than a private Docker/K8s network).
RUN apk add --no-cache ca-certificates

COPY --from=build /app/dist /usr/share/nginx/html

# nginx's official entrypoint auto-renders any *.template file in
# /etc/nginx/templates/ via envsubst into /etc/nginx/conf.d/ at container
# start, substituting BACKEND_HOST/BACKEND_SCHEME below. No VITE_API_URL
# build arg needed - the backend address is a runtime concern, not a
# build-time one.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=backend:8000
ENV BACKEND_SCHEME=http
ENV BACKEND_HOST_SUFFIX=""

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD wget -q -O- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
