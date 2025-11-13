import "jsr:@std/dotenv/load";
import { startPolling, getVehicles } from './foliService.js';

startPolling(); 

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

    const filePath = url.pathname === "/" 
    ? "../public/index.html" 
    : `../public${url.pathname}`;
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
  } else if (url.pathname === '/api/vehicles') {

    const vehicles = getVehicles(); 
    return json(vehicles);

  } else {

    return new Response("Not Found", { status: 404 });

  }

});
  
