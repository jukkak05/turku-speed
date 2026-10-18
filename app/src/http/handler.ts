import { apiHandler } from "./api.ts";
import { staticHandler } from "./static.ts";

// Function to handle http requests
const requestHandler = async (req: Request): Promise<Response> => {
  // Build the URL object
  const url = new URL(req.url);

  // Handle requests based on pathname
  if (url.pathname === "/api/vehicles") {
    // Handle api requests
    return apiHandler(req);
  } else {
    // Handle static files requests
    const response = await staticHandler(req);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    // Allow Leaflet from unpkg, map tiles from OpenStreetMap and Special Elite font from Google Fonts,
    // styles need 'unsafe-inline' for Leaflet's inline svg styles
    response.headers.set('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' https://unpkg.com",
      "style-src 'self' https://unpkg.com https://fonts.googleapis.com 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://unpkg.com https://tile.openstreetmap.org",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '));
    // response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');  
    return response; 
  }
};

export { requestHandler };
