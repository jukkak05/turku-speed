# TurkuSpeed

Real-time speed and location tracker for Turku public transport buses.
Vehicle positions are fetched from the [Föli API](http://data.foli.fi/) every 4 seconds. 
Speed is calculated from GPS coordinate changes between polls using the [geolib](https://www.npmjs.com/package/geolib) library.

## Stack

- **Runtime:** [Deno](https://deno.com)
- **Map:** [Leaflet](https://leafletjs.com) + [OpenStreetMap](https://www.openstreetmap.org/)
- **Distance:** [geolib](https://www.npmjs.com/package/geolib)

## Running locally

**Without docker** 

1. Install Deno: https://docs.deno.com/runtime/getting_started/installation/
2. Rename env.example as .env and fill in, if not using defaults
3. Run the app:
```bash
cd app && deno task bundle && deno task dev
```

**With docker**

Requires [Docker](https://docs.docker.com/get-docker/) with Compose plugin.

```bash
docker compose -f docker-compose.local.yml up --build
```

## Tests

```bash
cd app && deno task check && deno task test
```

Tests also run in GitHub Actions on pull requests and pushes to main and dev.

## Running production

The app needs an external Docker network named proxy-net and use of reverse proxy in front. 

Create the network once: 
```bash
docker network create proxy-net
```

The image is built by GitHub Actions ([ci.yml](.github/workflows/ci.yml)) on every push to main, after the tests pass, and published to `ghcr.io/jukkak05/turku-speed`.
On the server only `docker-compose.yml` and `.env` are needed, in the same directory:

```
turku-speed/
├── docker-compose.yml
└── .env
```

Create `.env` based on [app/.env.example](app/.env.example) and set `ALLOWED_ORIGINS` to the public URL of the app, e.g. `ALLOWED_ORIGINS=https://turkuspeed.example.com`.
Without it the websocket connection is rejected and the map is not shown.

Deploy / update: 
```bash
docker compose pull && docker compose up -d
```

## API Data Attribution

Lähde: Turun seudun joukkoliikenteen liikennöinti- ja aikatauludata. 
Aineiston ylläpitäjä on Turun kaupungin joukkoliikennetoimisto. 
Aineisto on ladattu palvelusta http://data.foli.fi/ lisenssillä Creative Commons Nimeä 4.0 Kansainvälinen (CC BY 4.0).
