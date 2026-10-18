import { assert, assertAlmostEquals, assertEquals, assertExists } from "@std/assert";
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

// Latitude for a point the given meters north of LAT (1 degree of latitude is ~111.3 km)
const north = (meters: number) => LAT + meters / 111319.5;

// Poll one moving vehicle through [seconds since T0, meters north of LAT] points
// and collect the speed reported after each poll
const replay = async (points: [number, number][]) => {
  const speeds: (number | undefined)[] = [];
  for (const [t, meters] of points) {
    await pollWith({ "1": bus("1", north(meters), LON, T0 + t) });
    speeds.push(getVehicles().lineRefs["1"]["1"].speed);
  }
  return speeds;
};

// Turn [seconds, meters] segments into cumulative [seconds, meters] points starting from 0
const fromSegments = (segments: [number, number][]) => {
  const points: [number, number][] = [[0, 0]];
  for (const [dt, dm] of segments) {
    const [t, m] = points[points.length - 1];
    points.push([t + dt, m + dm]);
  }
  return points;
};

Deno.test("calculates average speed once there is enough history", async () => {
  resetCache();
  // ~50 km/h = ~13.9 m/s
  const speeds = await replay([[0, 0], [4, 56], [8, 111], [12, 167]]);

  // No speed until 6 seconds of history
  assertEquals(speeds.slice(0, 2), [undefined, undefined]);
  for (const speed of speeds.slice(2)) {
    assertExists(speed);
    assertAlmostEquals(speed, 50, 1);
  }

  const vehicle = getVehicles().lineRefs["1"]["1"];
  assertEquals(vehicle.hasMoved, true);
  assertEquals(vehicle.latitude, north(167));
  assertEquals(vehicle.timestamp, T0 + 12);
});

Deno.test("smooths out jumps from uneven Föli timestamps (real data from bus 60093)", async () => {
  resetCache();
  // Segments [seconds, meters] recorded from the live feed with 4 s polling.
  // Speed per segment would jump between 38 and 85 km/h.
  const segments: [number, number][] = [
    [4, 56], [6, 71], [2, 29], [6, 63], [5, 118], [2, 34], [5, 65],
    [4, 66], [5, 97], [2, 33], [5, 65], [5, 98], [2, 32],
  ];
  const speeds = (await replay(fromSegments(segments))).filter((s) => s !== undefined);

  for (const speed of speeds) {
    assert(speed >= 40 && speed <= 66, `speed ${speed} out of range`);
  }
  for (let i = 1; i < speeds.length; i++) {
    assert(Math.abs(speeds[i] - speeds[i - 1]) <= 16, `jump ${speeds[i - 1]} -> ${speeds[i]}`);
  }
});

Deno.test("shows a steady speed when timestamps are rounded and uneven", async () => {
  resetCache();
  // Vehicle drives a steady 50 km/h, but reports arrive unevenly and timestamps are whole seconds
  const mps = 50 / 3.6;
  const trueTimes = [0, 4.9, 7.1, 12.8, 17.2, 19.9, 25.0, 29.6, 31.2, 36.9, 41.0, 43.1];
  const speeds = await replay(trueTimes.map((t) => [Math.floor(t), t * mps]));

  for (const speed of speeds.slice(3)) {
    assertExists(speed);
    assertAlmostEquals(speed, 50, 6);
  }
});

Deno.test("shows 0 when vehicle reports standing still", async () => {
  resetCache();
  await replay([[0, 0], [4, 56], [8, 111]]);
  await pollWith({ "1": bus("1", north(111), LON, T0 + 12) });

  const vehicle = getVehicles().lineRefs["1"]["1"];
  assertEquals(vehicle.hasMoved, false);
  assertEquals(vehicle.speed, 0);
});

Deno.test("speed after leaving a stop is not dragged down by the time standing", async () => {
  resetCache();
  // Stand still for 12 seconds, then drive ~50 km/h
  const speeds = await replay([[0, 0], [4, 0], [8, 0], [12, 0], [16, 56], [20, 111]]);
  assertEquals(speeds.slice(1, 4), [0, 0, 0]);
  // Only 4 seconds of history since the stop, keep showing 0
  assertEquals(speeds[4], 0);
  assertExists(speeds[5]);
  assertAlmostEquals(speeds[5], 50, 1);
});

Deno.test("keeps last speed when there is no new report from the vehicle", async () => {
  resetCache();
  const speeds = await replay([[0, 0], [4, 56], [8, 111]]);
  await pollWith({ "1": bus("1", north(111), LON, T0 + 8) });

  const vehicle = getVehicles().lineRefs["1"]["1"];
  assertEquals(vehicle.hasMoved, false);
  assertEquals(vehicle.speed, speeds[2]);
});

Deno.test("discards history after a long gap in reports", async () => {
  resetCache();
  const speeds = await replay([[0, 0], [4, 56], [8, 111], [48, 500], [52, 556], [56, 611]]);
  assertExists(speeds[2]);
  // No speed until 6 seconds of new history
  assertEquals(speeds.slice(3, 5), [undefined, undefined]);
  assertExists(speeds[5]);
  assertAlmostEquals(speeds[5], 50, 1);
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
