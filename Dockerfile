FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ coreutils bash \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --chown=node:node src ./src
COPY --chown=node:node public ./public

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

# Todo el servidor (y por tanto g++/los binarios evaluados) corre sin root.
USER node

CMD ["npm", "start"]
