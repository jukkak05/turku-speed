// Import geo functions
import { calculateAverageSpeed, type PositionSample } from "../lib/geo.ts";

// Import escaping from Deno standard html-library
// https://docs.deno.com/runtime/reference/std/html/
import { escape } from "@std/html/entities"

// Export set for connected web sockets
export const connectedSockets = new Set<WebSocket>(); 

// Type definitions
type LineRef = string;
type VehicleId = string; 
type ApiResponse = {
    status?: string;
    servertime?: number;
    result: { 
        vehicles: Record<VehicleId, ApiVehicle> 
    }; 
}
type ApiVehicle = {
    lineref: string; 
    latitude: number | null;
    longitude: number | null; 
    recordedattime: number; 
}
type VehiclesById = Record<VehicleId, CachedVehicle>;
type VehiclesByLineRef = Record<LineRef, VehiclesById>;
export type CachedVehicles = {
    status: string | undefined;
    servertime: number | null;
    lineRefs: VehiclesByLineRef; 
}
type CachedVehicle = {
    latitude: number;
    longitude: number; 
    timestamp: number;
    speed?: number; 
    hasMoved?: boolean;  
}

// Cache of vehicles by lineref and id
const cachedVehicles: CachedVehicles = {
    status: undefined, 
    servertime: null,
    lineRefs: {}    
}

// Latest vehicle ids from api response
const latestVehicleIds = new Set<VehicleId>();

// Recent position samples by vehicle id for speed calculation (not sent to clients)
const positionHistory = new Map<VehicleId, PositionSample[]>();

// Speed is averaged over this many seconds, because single Föli updates have
// uneven, whole second timestamps that make one-segment speeds jump around
const SPEED_WINDOW_S = 12;
// Minimum seconds of history before speed is shown
const MIN_SPEED_SPAN_S = 6;
// Gap in seconds after which old history is discarded (vehicle was offline)
const MAX_SAMPLE_GAP_S = 30;

// Stale counter for api coordinates
let staleCount = 0; 
const STALE_THRESHOLD = 6; 

// Helper: Fetch and Parse Föli API data
const fetchApiData = async (): Promise<ApiResponse | null> => {
    const res = await fetch(
        "http://data.foli.fi/siri/vm", { 
            headers: { 
                "User-Agent": "TurkuSpeed/1.0 (+https://turkuspeed.denoapp.dev; server-side fetch"
            }
        }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as ApiResponse;
}

// Helper: Update cache with new vehicle data
const updateCache = (data: ApiResponse): void => {

    // Add response status and servertime to cachedVehicles
    cachedVehicles.status = data.status ?? undefined; 
    cachedVehicles.servertime = data.servertime ?? null;  

    // Clear latest vehicle ids set
    latestVehicleIds.clear(); 

    // Handle each vehicle 
    Object.entries(data.result.vehicles).forEach(([id, vehicle]) => {

        // Abort if vehicle does not have coordinates
        if (vehicle.longitude == null || vehicle.latitude == null) return; 

        // Add vehicle id to the latest vehicles set
        latestVehicleIds.add(id);

        // Escape lineref string
        const safeLineref = escape(vehicle.lineref);

        // Add lineref object to cachedVehicles 
        if (!(safeLineref in cachedVehicles.lineRefs)) {
            cachedVehicles.lineRefs[safeLineref] = {};
        }

        // Reference to cached vehicle
        const cachedVeh = cachedVehicles.lineRefs[safeLineref][id];

        const lat = vehicle.latitude;
        const lon = vehicle.longitude;
        const timestamp = typeof vehicle.recordedattime === 'number' ? vehicle.recordedattime : 0;
        const sample: PositionSample = { latitude: lat, longitude: lon, timestamp };

        // Add new vehicle object to cachedVehicles and start its position history
        if (!cachedVeh) {
            cachedVehicles.lineRefs[safeLineref][id] = {
                latitude: lat, 
                longitude: lon, 
                timestamp: timestamp
            }
            positionHistory.set(id, [sample]);
            return; 
        }

        // Abort if there is no new report from the vehicle, keep last speed
        if (timestamp <= cachedVeh.timestamp) {
            cachedVeh.hasMoved = false;
            return;
        }

        // Update vehicle details on cachedVehicles
        cachedVeh.hasMoved = cachedVeh.latitude !== lat || cachedVeh.longitude !== lon;
        cachedVeh.latitude = lat;
        cachedVeh.longitude = lon;
        const previousTimestamp = cachedVeh.timestamp;
        cachedVeh.timestamp = timestamp;

        // Vehicle reported standing still: show 0 right away and restart history from here,
        // so the speed after leaving a stop is not dragged down by the time spent standing
        if (!cachedVeh.hasMoved) {
            cachedVeh.speed = 0;
            positionHistory.set(id, [sample]);
            return;
        }

        // Discard history after a long gap, then add the new sample
        let history = positionHistory.get(id) ?? [];
        if (timestamp - previousTimestamp > MAX_SAMPLE_GAP_S) {
            history = [];
            cachedVeh.speed = undefined;
        }
        history.push(sample);

        // Drop old samples, but keep one at or before the window start so the window is full
        while (history.length > 2 && history[1].timestamp <= timestamp - SPEED_WINDOW_S) {
            history.shift();
        }
        positionHistory.set(id, history);

        // Calculate average speed in km/h once there is enough history
        if (timestamp - history[0].timestamp >= MIN_SPEED_SPAN_S) {
            cachedVeh.speed = calculateAverageSpeed(history);
        }

    });

}

// Helper: Clean up removed vehicles
const cleanupCache = (): void => {
    
    // Remove vehicles from cache that are not in the latest api response
    Object.entries(cachedVehicles.lineRefs).forEach(([lineRef, vehicleIds]) => {
        Object.keys(vehicleIds).forEach(vehicleId => {
            if (!latestVehicleIds.has(vehicleId)) {
                delete (cachedVehicles.lineRefs[lineRef][vehicleId]);
                positionHistory.delete(vehicleId);
            }
        });
    });

    // Remove empty linerefs from cache after vehicle cleanup
    Object.keys(cachedVehicles.lineRefs).forEach(lineRef => {
       if (Object.keys(cachedVehicles.lineRefs[lineRef]).length === 0) {
          delete cachedVehicles.lineRefs[lineRef];
       }
    });

}

// Latest gzip compressed websocket payload
let latestPayload: ArrayBuffer | null = null;

// Helper: Build websocket payload
const buildWebsocketPayload = async (): Promise<ArrayBuffer> => {

    // Gzip compress json string of cached vehicles with native CompressionStream
    // https://docs.deno.com/api/web/~/CompressionStream
    const jsonString = JSON.stringify(cachedVehicles);
    const compressedStream = new Blob([jsonString]).stream().pipeThrough(new CompressionStream('gzip'));
    const compressedPayload = await new Response(compressedStream).arrayBuffer();

    // Debug payload size
    // const compressedSizeInKb = compressedPayload.byteLength / 1024;
    // console.log(`Compressed size: ${compressedSizeInKb.toFixed(2)} KB`);

    return compressedPayload;

}

// Helper: Get latest websocket payload for newly connected sockets
export const getWebsocketPayload = (): ArrayBuffer | null => {
    return latestPayload;
}

// Helper: Broadcast vehicles via websocket
const broadcastVehicles = async (): Promise<void> => {

    // Build and save payload
    const payload = await buildWebsocketPayload();
    latestPayload = payload;

    // Send moved vehicles data to websocket clients
    connectedSockets.forEach((socket) => {
        socket.send(payload);
    });

}

// Main function to fetch vehicles 
export const fetchVehicles = async (): Promise<void> => {

  try {

    // Fetch vehicles data
    const data = await fetchApiData(); 
    if (!data) return; 

    // Update cached vehicles
    updateCache(data);

    // Handle stale data (all buses still)
    const movedCount = Object.values(cachedVehicles.lineRefs)
    .flatMap(v => Object.values(v))
    .filter(v => v.hasMoved).length;

    if (movedCount === 0) {
        staleCount++;
    } else {
        staleCount = 0; 
    }

    if (staleCount >= STALE_THRESHOLD) {
        throw new Error('Stale coordinates');
    }

    // Clean up removed vehicles
    cleanupCache();

    // Broadcast vehicles
    await broadcastVehicles();

  } catch (err) {
    console.error("Failed to fetch vehicles: ", err);
    cachedVehicles.status = "API ERROR";
    await broadcastVehicles();
  }

} 

export function startPolling() {
    // Fetch vehicles on startup
    fetchVehicles(); 
    // Then fetch vehicles once every 4 seconds
    setInterval(fetchVehicles, 4000);
}

export function getVehicles() {
    return cachedVehicles;
}

// Reset cache and polling state (used by tests)
export function resetCache() {
    cachedVehicles.status = undefined;
    cachedVehicles.servertime = null;
    cachedVehicles.lineRefs = {};
    latestVehicleIds.clear();
    positionHistory.clear();
    staleCount = 0;
    latestPayload = null;
}