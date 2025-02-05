FROM node:18-alpine

RUN apk add --no-cache libc6-compat curl
WORKDIR /app

ARG ARTIFACT_URL=default
RUN wget -O geo-run.tar.gz ${ARTIFACT_URL}
RUN tar xzvf geo-run.tar.gz  --strip-components=1
# COPY .env ./
RUN corepack disable && npm install -g pnpm@latest

RUN pnpm i --frozen-lockfile
RUN pnpm build
RUN pnpm version-manifest

EXPOSE 3000

ENV PORT=3000
# Hostname is overridden by AWS AppRunner, either set it as an env configuration variable in AppRunner
# or force server.js to use a different env variable or hardcoded value
# ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
WORKDIR /app/server
CMD ["node", "dist/server.js"]