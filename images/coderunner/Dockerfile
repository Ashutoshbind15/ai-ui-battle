FROM node:24-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN corepack enable

# Install opencode CLI globally
RUN pnpm add -g opencode-ai

COPY . .

RUN pnpm install

# Install netcat for health checking
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

COPY start.sh ./start.sh
RUN chmod +x ./start.sh

CMD ["./start.sh"]