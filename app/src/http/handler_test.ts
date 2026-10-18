import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { requestHandler } from "./handler.ts";
import { connectedSockets, resetCache } from "../services/foliService.ts";

const ORIGIN = "http://localhost:8000";

// Deno's WebSocket accepts custom headers, but the "dom" lib in deno.json hides that overload
const DenoWebSocket = WebSocket as unknown as new (url: string, options: { headers: HeadersInit }) => WebSocket;

// Start a real server on a random port for each test
const withServer = async (fn: (baseUrl: string) => Promise<void>) => {
  const server = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen: () => {} }, requestHandler);
  try {
    await fn(`http://127.0.0.1:${server.addr.port}`);
  } finally {
    await server.shutdown();
  }
};

Deno.test("serves index.html with security headers", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/`);
    assertEquals(res.status, 200);
    assertStringIncludes(res.headers.get("content-type") ?? "", "text/html");
    assertStringIncludes(await res.text(), "<html");

    assertEquals(res.headers.get("x-frame-options"), "DENY");
    assertEquals(res.headers.get("x-content-type-options"), "nosniff");
    assertEquals(res.headers.get("cross-origin-resource-policy"), "same-origin");
    assertEquals(res.headers.get("permissions-policy"), "geolocation=(), camera=(), microphone=()");
    const csp = res.headers.get("content-security-policy") ?? "";
    assertStringIncludes(csp, "default-src 'self'");
    assertStringIncludes(csp, "frame-ancestors 'none'");
    assertStringIncludes(csp, "object-src 'none'");
  });
});

Deno.test("serves static assets", async () => {
  await withServer(async (baseUrl) => {
    for (const [path, type] of [["/app.js", "javascript"], ["/style.css", "text/css"]]) {
      const res = await fetch(`${baseUrl}${path}`);
      await res.body?.cancel();
      assertEquals(res.status, 200, path);
      assertStringIncludes(res.headers.get("content-type") ?? "", type, path);
    }
  });
});

Deno.test("returns 404 with security headers for unknown files", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/does-not-exist.txt`);
    await res.body?.cancel();
    assertEquals(res.status, 404);
    assertEquals(res.headers.get("x-content-type-options"), "nosniff");
  });
});

Deno.test("does not serve files outside public directory", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/../deno.json`);
    const body = await res.text();
    assert(!body.includes('"imports"'), "deno.json leaked");
  });
});

Deno.test("api returns 426 for non-websocket requests", async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/vehicles`);
    await res.body?.cancel();
    assertEquals(res.status, 426);
  });
});

Deno.test("api rejects websocket upgrade from unknown or missing origin", async () => {
  Deno.env.set("ALLOWED_ORIGINS", ORIGIN);
  try {
    await withServer(async (baseUrl) => {
      const upgradeHeaders = {
        "upgrade": "websocket",
        "connection": "Upgrade",
        "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
        "sec-websocket-version": "13",
      };
      for (const origin of ["https://evil.example", undefined]) {
        const headers = origin ? { ...upgradeHeaders, origin } : upgradeHeaders;
        const res = await fetch(`${baseUrl}/api/vehicles`, { headers });
        await res.body?.cancel();
        assertEquals(res.status, 404, `origin: ${origin}`);
      }
    });
  } finally {
    Deno.env.delete("ALLOWED_ORIGINS");
  }
});

Deno.test("api accepts websocket from allowed origin and tracks the socket", async () => {
  resetCache();
  Deno.env.set("ALLOWED_ORIGINS", `https://turkuspeed.example,${ORIGIN}`);
  try {
    await withServer(async (baseUrl) => {
      const ws = new DenoWebSocket(`${baseUrl.replace("http", "ws")}/api/vehicles`, {
        headers: { origin: ORIGIN },
      });
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("WebSocket connection failed"));
      });

      // Server adds the socket on open
      for (let i = 0; i < 50 && connectedSockets.size === 0; i++) {
        await new Promise((r) => setTimeout(r, 10));
      }
      assertEquals(connectedSockets.size, 1);

      const closed = new Promise((resolve) => (ws.onclose = resolve));
      ws.close();
      await closed;
      for (let i = 0; i < 50 && connectedSockets.size > 0; i++) {
        await new Promise((r) => setTimeout(r, 10));
      }
      assertEquals(connectedSockets.size, 0);
    });
  } finally {
    Deno.env.delete("ALLOWED_ORIGINS");
  }
});
