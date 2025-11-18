import { startPolling, getVehicles } from './foliService.js';

// Poll Föli Api on launch
startPolling(); 

// Set hostname and port
const hostname = '0.0.0.0';
const port = 8080;

// Rate limit settings for api usage
const RATE_LIMIT = 10_000; // 10 seconds
const lastHit = new Map(); // IP -> ms since epoch

// Function to get the client ip or forwarded header
function clientIp(req) {
  return req.headers.get("fly-client-ip")
    || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim()
    || "unknown";
}

// Function to rate limit access
function isBlocked(ip) {
  const now = Date.now();
  const prev = lastHit.get(ip) ?? 0;
  if (now - prev < RATE_LIMIT) return true;
  lastHit.set(ip, now);
  return false;
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
    const publicRoot = new URL("../public/", import.meta.url);
    const fileUrl = url.pathname === "/"
    ? new URL("index.html", publicRoot)
    : new URL(url.pathname.slice(1), publicRoot);

    // Try to serve files
    try {

      // Read file and set content-type 
      const file = await Deno.readFile(fileUrl);
      const filePath = fileUrl.pathname; 
      const contentType = filePath.endsWith(".html") ? "text/html" :
                          filePath.endsWith(".js") ? "application/javascript" :
                          filePath.endsWith(".css") ? "text/css" : 
                          filePath.endsWith(".jpg") ? "image/jpeg" : ""

      // Return response with content-type header               
      return new Response(
        file, { 
          headers: { 
            "content-type": contentType 
          } 
        }
      );
    } catch {
      return new Response("Error requesting files", { status: 404 });
    }
  } else if (url.pathname === '/api/vehicles') { // Serve API requests

    console.log(req.headers);

    // Get the client ip
    const ip = clientIp(req);

    console.log(ip);

    // Rate limit access to once every 10 sec for an ip
    if ( !isBlocked(ip) ) {
      
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
      return new Response("Too many requests", { status: 429});
    }
  } else {
    return new Response("Nothing to see here!", { status: 403 });
  }
  
});
  
