// Import serveDir from deno standard http library
// https://docs.deno.com/runtime/reference/std/http/
import { serveDir } from "@std/http";

const staticHandler = async (req: Request): Promise<Response> => {
  return await serveDir(req, {
    fsRoot: "./public",
    quiet: true, 
  });
};

export { staticHandler };
