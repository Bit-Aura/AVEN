FROM node:20-alpine AS builder

WORKDIR /app

# Copy the shared packages first so tsconfig resolution works
COPY packages/shared-types ./packages/shared-types

# Copy package descriptors for installing dependencies
COPY apps/web/package.json apps/web/package-lock.json* ./apps/web/
WORKDIR /app/apps/web
RUN npm install

# Copy the rest of the web application source code
COPY apps/web ./
RUN npm run build

FROM nginx:alpine
# Serve the static export 'out' folder
COPY --from=builder /app/apps/web/out /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
