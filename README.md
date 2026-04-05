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

## Running production

The app needs an external Docker network named proxy-net and use of reverse proxy in front. 

Create the network once: 
```bash
docker network create proxy-net
```

Then deploy: 
```bash
docker compose up --build -d
```

## API Data Attribution

Lähde: Turun seudun joukkoliikenteen liikennöinti- ja aikatauludata. 
Aineiston ylläpitäjä on Turun kaupungin joukkoliikennetoimisto. 
Aineisto on ladattu palvelusta http://data.foli.fi/ lisenssillä Creative Commons Nimeä 4.0 Kansainvälinen (CC BY 4.0).
