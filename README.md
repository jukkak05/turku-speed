# TurkuSpeed

Real-time speed and location tracker for Turku public transport buses.
Vehicle positions are fetched from the [Föli API](http://data.foli.fi/) every 3 seconds. 
Speed is calculated from GPS coordinate changes between polls using the [geolib](https://www.npmjs.com/package/geolib) library.

## Stack

- **Runtime:** [Deno](https://deno.com)
- **Map:** [Leaflet](https://leafletjs.com) + [OpenStreetMap](https://www.openstreetmap.org/)
- **Distance:** [geolib](https://www.npmjs.com/package/geolib)

## Running locally

1. Install Deno: https://docs.deno.com/runtime/getting_started/installation/
2. Copy env.example to .env and fill in, if not using defaults
3. cd app
4. deno task bundle
5. deno task dev

## API Data Attribution

Lähde: Turun seudun joukkoliikenteen liikennöinti- ja aikatauludata. 
Aineiston ylläpitäjä on Turun kaupungin joukkoliikennetoimisto. 
Aineisto on ladattu palvelusta http://data.foli.fi/ lisenssillä Creative Commons Nimeä 4.0 Kansainvälinen (CC BY 4.0).
