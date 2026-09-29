FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ coreutils bash \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --chown=node:node src ./src
COPY --chown=node:node public ./public

# Render Free sólo dispone de 0.1 CPU. Precompilamos los headers C++ durante
# el Docker build (que ocurre fuera del request) para que cada envío no tenga
# que volver a parsear STL desde cero.
RUN g++ -std=c++17 -O0 -pipe -x c++-header /app/src/judge_pch.hpp -o /app/src/judge_pch.hpp.gch \
    && chown node:node /app/src/judge_pch.hpp.gch

ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000

USER node

CMD ["npm", "start"]
