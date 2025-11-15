import { startPolling, getVehicles } from './foliService.js';

// Poll Föli Api on launch
startPolling(); 

// Set hostname and port
const hostname = 'localhost';
const port = 8080;

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
    const filePath = url.pathname === "/" ? "../public/index.html" : `../public${url.pathname}`;

    // Try to serve files
    try {
      const file = await Deno.readFile(filePath);
      const contentType = filePath.endsWith(".html") ? "text/html" :
                          filePath.endsWith(".js") ? "application/javascript" :
                          filePath.endsWith(".css") ? "text/css" : ""
      return new Response(
        file, { 
          headers: { 
            "content-type": contentType 
          } 
        }
      );
    } catch {
      return new Response("Error requesting files", { status: 503 });
    }
  } else if (url.pathname === '/api/vehicles') {

    // Only allow requests from localhost
    if ( req.headers.get('host') === `${hostname}:${port}` ) {
      
      // Get vehicles data
      const vehicles = getVehicles(); 
    
      // Return vehicles
      return new Response(JSON.stringify(vehicles), {
        status: 200, 
        headers: {
          "content-type": "application/json; charset=utf-8"
        },
      });
    } else {
      return new Response("Request not allowed", { status: 403});
    }
  } else {
    return new Response("Nothing to see here!", { status: 403 });
  }
});
  
