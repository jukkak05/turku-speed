# Pieni ja vakaa peruskuva Denolle
FROM denoland/deno:latest

# Työhakemisto
WORKDIR /app

# (Valinnainen) deno.json / deno.jsonc tehtäviä yms. varten
#COPY deno.json* ./

# Sovelluskoodi ja staattiset tiedostot
COPY src ./src
COPY public ./public

# Esilataa riippuvuudet (nopeammat deployt ja vähemmän cold start -viivettä)
# Tämä hakee myös mahdolliset npm:-tuonnit (esim. "npm:hono")
RUN deno cache src/server.js

# Fly.io käyttää PORT-muuttujaa; pidä se ja kuuntele 0.0.0.0:PORT
ENV PORT=8080
EXPOSE 8080

# Suositellut vähimmät oikeudet:
#  --allow-net  : verkkokutsut (Föli, Digiroad, sisäinen HTTP)
#  --allow-env  : PORT ym. ympäristömuuttujat
#  --allow-read : public/ (index.html, tms.)
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "src/server.js"]
