FROM denoland/deno:2.9.7@sha256:fa335acdf6b72106eda2cb6a8cb5f4187e7630e357467489db4b2e7352d5e432

WORKDIR /app
COPY --chown=deno:deno ./app .
USER deno
RUN deno install --frozen

# Environment variables come from docker compose env_file, .env is not in the image
EXPOSE 8000
CMD ["deno", "run", "--cached-only", "--allow-net", "--allow-read", "--allow-env", "main.ts"]
