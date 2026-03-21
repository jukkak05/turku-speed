// Import http from Deno standard library
// https://docs.deno.com/runtime/reference/std/http/
import { serveFile } from "@std/http";

const staticHandler = async (req: Request, url: URL): Promise<Response> => {

  // Pathname for root, other files and everything else
  const pathname = 
    url.pathname === "/" ? "/index.html" 
    : url.pathname.includes(".") ? url.pathname
    : "/index.html";

  // File extension of the request
  const fileExtension = pathname.split('.').pop() ?? '';

  // Only allow requests for certain file types
  const allowedTypes = ['html', 'css', 'js'];
  if (!allowedTypes.includes(fileExtension)) {
     return new Response('Nothing to see here!', { status: 403} );
  }

  // Construct safe file path
  const filePath = `./public${pathname}`;

  // Serve static files
  try {
    return await serveFile(req, filePath);
  } catch {
    return new Response("File not found!", { status: 404});
  }
  
};

export { staticHandler };
