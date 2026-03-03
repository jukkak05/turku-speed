#!/bin/bash
set -e
cd ./app
deno task check
cd ..
docker compose -f compose-local.yml up --build --abort-on-container-exit