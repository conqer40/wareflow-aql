FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=7860
ENV HOST=0.0.0.0
ENV LOAD_DEMO_DATA=false

EXPOSE 7860

CMD ["node", "server/server.mjs"]
