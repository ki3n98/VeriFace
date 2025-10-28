FROM node:20-alpine AS dev
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-p", "3000", "-H", "0.0.0.0"]
