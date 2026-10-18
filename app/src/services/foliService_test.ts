import { assert, assertEquals, assertExists } from "@std/assert";
import {
  type CachedVehicles,
  connectedSockets,
  fetchVehicles,
  getVehicles,
  getWebsocketPayload,
  resetCache,
} from "./foliService.ts";

type MockVehicle = {
  lineref: string;
  latitude: number | null;
  longitude: number | null;
  recordedattime: number;
};

const T0 = 1700000000;
const LAT = 60.4509;
const LON = 22.2669;

// Build a Föli siri/vm style response body
const apiBody = (vehicles: Record<string, MockVehicle>, servertime = T0) => ({
  status: "OK",
  servertime,
  result: { vehicles },
});

// Run fetchVehicles with globalThis.fetch replaced by the given responder
const poll = async (respond: (input: RequestInfo | URL, init?: RequestInit) => Response) => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  globalThis.fetch = (input, init) => Promise.resolve(respond(input, init));
  console.error = () => {};
  try {
    await fetchVehicles();
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
};

const pollWith = (vehicles: Record<string, MockVehicle>, servertime?: number) =>
  poll(() => Response.json(apiBody(vehicles, servertime)));

const bus = (lineref: string, latitude: number | null, longitude: number | null, recordedattime: number) => ({
  lineref,
  latitude,
  longitude,
  recordedattime,
});

// Decompress gzip websocket payload back to cached vehicles
const decodePayload = async (payload: ArrayBuffer): Promise<CachedVehicles> => {
  const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
};

Deno.test("fetches Föli API with a User-Agent header", async () => {
  resetCache();
  let url = "";
  let userAgent: string | null = null;
  await poll((input, init) => {
    url = String(input);
    userAgent = new Headers(init?.headers).get("User-Agent");
    return Response.json(apiBody({}));
  });
  assertEquals(url, "http://data.foli.fi/siri/vm");
  assert(userAgent !== null && (userAgent as string).startsWith("TurkuSpeed/"));
});

Deno.test("adds new vehicles to cache grouped by lineref", async () => {
  resetCache();
  await pollWith({
    "1": bus("1", LAT, LON, T0),
    "2": bus("1", LAT + 0.01, LON, T0),
    "3": bus("32", LAT, LON + 0.01, T0),
  }, T0 + 1);

  const cache = getVehicles();
  assertEquals(cache.status, "OK");
  assertEquals(cache.servertime, T0 + 1);
  assertEquals(Object.keys(cache.lineRefs).sort(), ["1", "32"]);
  assertEquals(Object.keys(cache.lineRefs["1"]).sort(), ["1", "2"]);
  assertEquals(cache.lineRefs["1"]["1"], { latitude: LAT, longitude: LON, timestamp: T0 });
});

Deno.test("skips vehicles without coordinates", async () => {
  resetCache();
  await pollWith({
    "1": bus("1", null, LON, T0),
    "2": bus("1", LAT, null, T0),
    "3": bus("1", LAT, LON, T0),
  });
  assertEquals(Object.keys(getVehicles().lineRefs["1"]), ["3"]);
});

Deno.test("escapes HTML in lineref", async () => {
  resetCache();
  await pollWith({ "1": bus("<b>1</b>", LAT, LON, T0) });
  assertEquals(Object.keys(getVehicles().lineRefs), ["&lt;b&gt;1&lt;/b&gt;"]);
});

Deno.test("calculates speed when vehicle has moved", async () => {
  resetCache();
  await pollWith({ "1": bus("1", LAT, LON, T0) });
  // ~22 meters north in 4 seconds = ~20 km/h
  await pollWith({ "1": bus("1", LAT + 0.0002, LON, T0 + 4) });

  const vehicle = getVehicles().lineRefs["1"]["1"];
  assertEquals(vehicle.hasMoved, true);
  assertEquals(vehicle.oldLat, LAT);
  assertEquals(vehicle.oldLon, LON);
  assertEquals(vehicle.latitude, LAT + 0.0002);
  assertEquals(vehicle.oldtimestamp, T0);
  assertEquals(vehicle.timestamp, T0 + 4);
  assertEquals(vehicle.travelledTime, 4);
  assertEquals(vehicle.travelledDistance, 22);
  assertEquals(vehicle.speed, 20);
});

Deno.test("marks vehicle as not moved and keeps last speed when it stays still", async () => {
  resetCache();
  await pollWith({ "1": bus("1", LAT, LON, T0) });
  await pollWith({ "1": bus("1", LAT + 0.0002, LON, T0 + 4) });
  await pollWith({ "1": bus("1", LAT + 0.0002, LON, T0 + 8) });

  const vehicle = getVehicles().lineRefs["1"]["1"];
  assertEquals(vehicle.hasMoved, false);
  assertEquals(vehicle.speed, 20);
});

Deno.test("removes vehicles and empty linerefs missing from latest response", async () => {
  resetCache();
  await pollWith({
    "1": bus("1", LAT, LON, T0),
    "2": bus("1", LAT + 0.01, LON, T0),
    "3": bus("32", LAT, LON + 0.01, T0),
  });
  await pollWith({ "1": bus("1", LAT + 0.0002, LON, T0 + 4) });

  const cache = getVehicles();
  assertEquals(Object.keys(cache.lineRefs), ["1"]);
  assertEquals(Object.keys(cache.lineRefs["1"]), ["1"]);
});

Deno.test("sets API ERROR status when Föli API responds with error", async () => {
  resetCache();
  await poll(() => new Response("Bad gateway", { status: 502 }));
  assertEquals(getVehicles().status, "API ERROR");

  // Error status is broadcast to clients too
  const payload = getWebsocketPayload();
  assertExists(payload);
  assertEquals((await decodePayload(payload)).status, "API ERROR");
});

Deno.test("sets API ERROR status when fetch throws", async () => {
  resetCache();
  await poll(() => {
    throw new TypeError("network down");
  });
  assertEquals(getVehicles().status, "API ERROR");
});

Deno.test("sets API ERROR status after 6 polls without any moving vehicles", async () => {
  resetCache();
  for (let i = 0; i < 5; i++) {
    await pollWith({ "1": bus("1", LAT, LON, T0 + i * 4) });
    assertEquals(getVehicles().status, "OK");
  }
  await pollWith({ "1": bus("1", LAT, LON, T0 + 20) });
  assertEquals(getVehicles().status, "API ERROR");

  // A moving vehicle resets the stale counter
  await pollWith({ "1": bus("1", LAT + 0.0002, LON, T0 + 24) });
  assertEquals(getVehicles().status, "OK");
});

Deno.test("broadcasts gzip compressed cache to connected sockets", async () => {
  resetCache();
  assertEquals(getWebsocketPayload(), null);

  const sent: ArrayBuffer[] = [];
  const socket = { send: (data: ArrayBuffer) => sent.push(data) } as unknown as WebSocket;
  connectedSockets.add(socket);
  try {
    await pollWith({ "1": bus("1", LAT, LON, T0) });
  } finally {
    connectedSockets.delete(socket);
  }

  assertEquals(sent.length, 1);
  assertEquals(getWebsocketPayload(), sent[0]);
  const decoded = await decodePayload(sent[0]);
  assertEquals(decoded, JSON.parse(JSON.stringify(getVehicles())));
});
