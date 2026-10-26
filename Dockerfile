FROM denoland/deno:2.9.7@sha256:fa335acdf6b72106eda2cb6a8cb5f4187e7630e357467489db4b2e7352d5e432

ENV DENO_NO_UPDATE_CHECK=1

WORKDIR /app
# Code is owned by root, so the app (running as deno) can't change it
COPY ./app .
USER deno
# Download dependencies into the deno-owned cache at build time
RUN deno install --frozen --entrypoint main.ts

# Deno permissions. A new external host or env variable must be added here.
# APP_NET: listen address + each external host (Föli API)
# APP_ENV: every variable the app reads (Deno.env.get)
ENV APP_NET=0.0.0.0:8000,data.foli.fi \
    APP_ENV=HOST,PORT,ALLOWED_ORIGINS \
    APP_READ=/app

# Environment variables come from docker compose env_file, .env is not in the image
EXPOSE 8000
# exec: Deno replaces the shell and receives stop signals
CMD ["sh", "-c", "exec deno run --cached-only --frozen --allow-net=$APP_NET --allow-env=$APP_ENV --allow-read=$APP_READ main.ts"]
