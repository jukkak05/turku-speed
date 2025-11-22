import { getVehicles, startPolling } from "./foliService.js";

// Poll Föli Api on launch
startPolling();

// Set hostname and port
const hostname = "localhost";
const port = 8080;

// Function to get the client ip or forwarded header
function clientIp(req) {
  return req.headers.get("fly-client-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
}

// Rate limiter settings
const WINDOW_MS = 8000; // Refill window 8 sec
const MAX_TOKENS = 2; // Max requests per window
const buckets = new Map(); // Map to store IP -> { tokens, lastRefill }

// Function for rate limiting requests
function canProceed(ip) {
  // Current time
  const now = Date.now();

  // Get previously stored state for this ip
  let bucket = buckets.get(ip);

  // Check if there is no bucket or the last refill was over 8 s ago
  if (!bucket || now - bucket.lastRefill >= WINDOW_MS) {
    // Reset the bucket for max 2 tokens and set last refill time for now
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
  }

  // If bucket is empty of tokens
  if (bucket.tokens <= 0) {
    // Persist the current state so we remember when to refill
    buckets.set(ip, bucket);

    // Return false to reject the request
    return false;
  }

  // Remove one token from bucket, store bucket for the ip and allow request
  bucket.tokens -= 1;
  buckets.set(ip, bucket);
  return true;
}

Deno.serve({
  hostname: hostname,
  port: port,
}, async (req) => {
  // Build URL object
  const url = new URL(req.url);

  // Serve static files
  if (url.pathname.startsWith("/") && !url.pathname.startsWith("/api/")) {
   
    // URL Object for public folder 
    const publicRoot = new URL("../public/", import.meta.url);

    // URL Object for file in public folder
    const fileUrl = url.pathname === "/"
      ? new URL("index.html", publicRoot)
      : new URL(url.pathname.slice(1), publicRoot);

    // Try to serve files
    try {

      // Extract file extension from file path
      const filePath = fileUrl.pathname; 
      const ext = filePath.split('.').pop() ?? ''; 

      // Only allow html, css and js files
      const allowedTypes = ['html','css','js'];
      if (!allowedTypes.includes(ext)) {
        return new Response("Nothing to see here!", { status: 403 });
      }

      // Read file and fileInfo
      const file = await Deno.readFile(fileUrl);
      const fileInfo = await Deno.stat(fileUrl);

      // Set last modified time
      const lastModified = fileInfo.mtime?.toUTCString(); 

      // Headers for different file types
      const fileHeaders = {
        html: {
          type: "text/html", 
          cache: "public, max-age=60, must-revalidate"
        },
        js: {
          type: "application/javascript",
          cache: "public, max-age=86400, must-revalidate",
          modified: lastModified
        },
        css: {
          type: "text/css", 
          cache: "public, max-age=86400, must-revalidate",
          modified: lastModified
        }
      };

      // Return file in response with headers
      return new Response(
        file, {
          headers: {
            'content-type': fileHeaders[ext].type,
            'cache-control': fileHeaders[ext].cache,
            'last-modified': lastModified ? lastModified : ''
          }
        },
      );
    } catch {
      // Return error response when file is unavailable
      return new Response("Error requesting files", { status: 404 });
    }
  } else if (url.pathname === "/api/vehicles") { // Serve API requests
    // Get the client ip
    const ip = clientIp(req);

    // Continue if allowed by rate limiter
    if (canProceed(ip)) {
      // Get vehicles data
      const vehicles = getVehicles();

      // Return vehicles data
      return new Response(JSON.stringify(vehicles), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      });
    } else {
      // Return error if requests are over bucket limit
      return new Response("Hold on! Too many requests", { status: 429 });
    }
  } else {
    // Return error if requested something outside the app scope
    return new Response("Nothing to see here!", { status: 403 });
  }
});
