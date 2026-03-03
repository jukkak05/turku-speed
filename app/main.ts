import { startPolling } from "./src/services/foliService.ts";
import { requestHandler } from "./src/http/handler.ts";

// Poll Föli Api on launch
startPolling();

// Serves HTTP requests with the given handler.
// https://docs.deno.com/api/deno/~/Deno.serve
Deno.serve({
  hostname: Deno.env.get('HOST') ?? '0.0.0.0',
  port: Number(Deno.env.get('PORT') ?? '8000'),
}, async (req: Request) => {
  // Handle http request in handler
  return await requestHandler(req);
});
