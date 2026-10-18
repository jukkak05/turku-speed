FROM denoland/deno:2.9.7

WORKDIR /app
COPY --chown=deno:deno ./app .
USER deno
RUN deno install --frozen

EXPOSE 8000
CMD ["deno", "run", "--cached-only", "--allow-net", "--allow-read", "--allow-env", "--env-file", "main.ts"]
