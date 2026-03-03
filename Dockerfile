FROM denoland/deno:latest

WORKDIR /app
COPY ./app .
RUN deno install --frozen

EXPOSE 8000
CMD ["deno", "run", "--cached-only", "--allow-net", "--allow-read", "main.ts"]
