import "jsr:@std/dotenv/load";

// Get environment variables
const hostname = Deno.env.get("HOSTNAME") === "production" ? "0.0.0.0" : "localhost";
const port = Number(Deno.env.get("PORT")) || 8080;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8",
               "access-control-allow-origin": "*" },
  });
}

Deno.serve({ 
  hostname: hostname, 
  port: port 
}, 
async (req) => {

const url = new URL(req.url);

if (url.pathname.startsWith("/") && !url.pathname.startsWith("/api/")) {
  const filePath = url.pathname === "/" ? "../public/index.html" : `../public${url.pathname}`;
  try {
    const file = await Deno.readFile(filePath);
    const contentType = filePath.endsWith(".html") ? "text/html" :
                        filePath.endsWith(".js") ? "application/javascript" :
                        filePath.endsWith(".css") ? "text/css" :
                        "application/octet-stream";
    return new Response(
      file, { 
        headers: { 
          "content-type": contentType 
        } 
      });
  } catch {
    // File not found, continue to API routes
  }
}

//   if (url.pathname === "/api/vehicles") {
//     // TODO: palauta välimuistista Föli-snapshot
//     return json([{ id: "demo", lat: 60.45, lon: 22.27, speedKmh: 0 }]);
//   }

//   if (url.pathname === "/api/speedlimit") {
//     const lat = Number(url.searchParams.get("lat"));
//     const lon = Number(url.searchParams.get("lon"));
//     if (!Number.isFinite(lat) || !Number.isFinite(lon)) return json({ error: "bad params" }, 400);
//     // TODO: hae Digiroadista ja välimuistita
//     return json({ limit: 40 });
//   }

//   if (url.pathname === "/") {
//     const html = await Deno.readTextFile("public/index.html").catch(() => "ok");
//     return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
//   }

  return new Response("Not Found", { status: 404 });
});