FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY driver-bot.mjs ./

ENV NODE_ENV=production
CMD ["node", "driver-bot.mjs"]
