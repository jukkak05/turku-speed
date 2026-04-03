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
    // response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');  
    return response; 
  }
};

export { requestHandler };
