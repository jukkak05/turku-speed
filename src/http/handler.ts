import { apiHandler } from "./api.ts";
import { staticHandler } from "./static.ts";

// Funtion to get the client ip or forwarded header
function _clientIp(req) {
  console.log(req);
}

// Function for rate limiting requests
function _canProceed(ip) {
}

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
    return await staticHandler(req, url);
  }
};

export { requestHandler };
