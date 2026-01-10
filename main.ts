import { startPolling } from "./src/services/foliService.ts";
import { requestHandler } from "./src/http/handler.ts";

// Poll Föli Api on launch
startPolling();

// Serves HTTP requests with the given handler.
// https://docs.deno.com/api/deno/~/Deno.serve
Deno.serve({
  hostname: "localhost",
  port: 8080,
}, async (req) => {
  // Handle http request in handler
  await requestHandler(req);
});
