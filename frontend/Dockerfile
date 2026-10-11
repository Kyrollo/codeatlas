# Multi-stage Dockerfile for CodeAtlas Frontend
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

FROM caddy:2-alpine AS runtime

COPY --from=builder /app/dist /usr/share/caddy
EXPOSE 3004

CMD ["caddy", "file-server", "--root", "/usr/share/caddy", "--listen", ":3004"]
