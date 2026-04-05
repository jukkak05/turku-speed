// Import geo functions
import { calculateTravellingTime, calculateTravellingDistance, calculateTravellingSpeed } from "../lib/geo.ts";

// Import gzip 
import { gzip } from "compress"

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
    oldtimestamp?: number; 
    oldLat?: number; 
    oldLon?: number;
    travelledTime?: number; 
    travelledDistance?: number; 
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

        // Add new vehicle object to cachedVehicles 
        if (!cachedVeh) {
            const lat = typeof vehicle.latitude === 'number' ? vehicle.latitude : 0; 
            const lon = typeof vehicle.longitude === 'number' ? vehicle.longitude : 0;
            const timestamp = typeof vehicle.recordedattime === 'number' ? vehicle.recordedattime : 0; 
            cachedVehicles.lineRefs[safeLineref][id] = {
                latitude: lat, 
                longitude: lon, 
                timestamp: timestamp
            }
            return; 
        }

        // Abort if vehicle has stayed still and set hasMoved property to false
        if (cachedVeh.latitude === vehicle.latitude && cachedVeh.longitude === vehicle.longitude) {
            cachedVeh.hasMoved = false; 
            return; 
        } 

        // Update vehicle details on cachedVehicles
        cachedVeh.oldLat = cachedVeh.latitude; 
        cachedVeh.oldLon = cachedVeh.longitude;
        cachedVeh.latitude = typeof vehicle.latitude === 'number' ? vehicle.latitude : 0; 
        cachedVeh.longitude = typeof vehicle.longitude === 'number' ? vehicle.longitude : 0; 
        cachedVeh.oldtimestamp = cachedVeh.timestamp;
        cachedVeh.timestamp = typeof vehicle.recordedattime === 'number' ? vehicle.recordedattime : 0; 
        cachedVeh.hasMoved = true; 

        // Calculate time in seconds that the vehicle has travelled
        cachedVeh.travelledTime = calculateTravellingTime(cachedVeh.timestamp, cachedVeh.oldtimestamp);

        // Calculate distance in meters that the vehicle has travelled
        cachedVeh.travelledDistance = calculateTravellingDistance(
            { 
                latitude: cachedVeh.oldLat, 
                longitude: cachedVeh.oldLon
            },
            {
                latitude:  cachedVeh.latitude, 
                longitude:  cachedVeh.longitude
            }
        );
        
        // Calculate speed in km/h that the vehicle has travelled
        cachedVeh.speed = calculateTravellingSpeed(cachedVeh.travelledDistance, cachedVeh.travelledTime);

    });

}

// Helper: Clean up removed vehicles
const cleanupCache = (): void => {
    
    // Remove vehicles from cache that are not in the latest api response
    Object.entries(cachedVehicles.lineRefs).forEach(([lineRef, vehicleIds]) => {
        Object.keys(vehicleIds).forEach(vehicleId => {
            if (!latestVehicleIds.has(vehicleId)) {
                delete (cachedVehicles.lineRefs[lineRef][vehicleId]);
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

// Helper: Build websocket payload
export const buildWebsocketPayload = (): ArrayBuffer => {

    // Gzip compress json string of cached vehicles
    const jsonString = JSON.stringify(cachedVehicles);
    const compressedPayload = gzip(new TextEncoder().encode(jsonString));

    // Debug payload size
    // const compressedSizeInKb = compressedPayload.length / 1024;
    // console.log(`Compressed size: ${compressedSizeInKb.toFixed(2)} KB`);

    return compressedPayload.buffer as ArrayBuffer;

}

// Helper: Broadcast vehicles via websocket
const broadcastVehicles = (): void => {

    // Get payload
    const payload = buildWebsocketPayload(); 

    // Send moved vehicles data to websocket clients
    connectedSockets.forEach((socket) => {
        socket.send(payload);
    });

}

// Main function to fetch vehicles 
const fetchVehicles = async (): Promise<void> => {

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
    broadcastVehicles(); 
   
  } catch (err) {
    console.error("Failed to fetch vehicles: ", err);
    cachedVehicles.status = "API ERROR";
    broadcastVehicles(); 
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