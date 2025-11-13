import { startPolling, getVehicles } from './foliService.js';

// Poll Föli Api on launch
startPolling(); 

// Set hostname and port
const hostname = 'localhost';
const port = 8080;

// Return vehicles data from Föli API
function returnVehicles(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*" 
    },
  });
}

// Serves HTTP requests with the given handler.
// https://docs.deno.com/api/deno/~/Deno.serve
Deno.serve({ 
  hostname: hostname, 
  port: port 
}, 
async (req) => {

  // Build URL object
  const url = new URL(req.url);

  // Serve static files
  if (url.pathname.startsWith("/") && !url.pathname.startsWith("/api/")) {

    // Check what to serve based on request
    const filePath = url.pathname === "/" 
    ? "../public/index.html" 
    : `../public${url.pathname}`;

    // Try to serve files
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
    return returnVehicles(vehicles);
  } else {
    return new Response("Nothing to see here!", { status: 404 });
  }

});
  
