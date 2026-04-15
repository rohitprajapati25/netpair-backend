# Build Stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
# If you have other folders needed at runtime (like uploads or certs):
# COPY --from=build /app/uploads ./uploads 

EXPOSE 5000
CMD ["node", "dist/cluster.js"]
