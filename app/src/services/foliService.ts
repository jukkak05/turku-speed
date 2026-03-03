// Import geo functions
import { calculateTravellingTime, calculateTravellingDistance, calculateTravellingSpeed } from "../lib/geo.ts";
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
export type CachedVehicles = {
    status: string | undefined;
    servertime: number | null;
    lineRefs: Record<LineRef, 
        Record<VehicleId, CachedVehicle>
    >;
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

// Function to fetch vehicles 
const fetchVehicles = async (): Promise<void> => {

  try {

    // Poll Föli API for vehicles data
    // Docs: https://data.foli.fi/doc/index
    const res = await fetch("https://data.foli.fi/siri/vm");

    // Handle response error
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Parse json data from response
    const data = (await res.json() as ApiResponse); 
    console.log("New vehicles data fetched");

    // Add response status and servertime to cachedVehicles
    cachedVehicles.status = data.status ?? undefined; 
    cachedVehicles.servertime = data.servertime ?? null;  

    // Clear latest vehicle ids set
    latestVehicleIds.clear(); 

    // Handle each vehicle 
    Object.entries(data.result.vehicles).forEach(([id, vehicle]) => {

        // Add vehicle id to the latest vehicles set
        latestVehicleIds.add(id);

        // Add lineref object to cachedVehicles 
        if (!(vehicle.lineref in cachedVehicles.lineRefs)) {
            cachedVehicles.lineRefs[vehicle.lineref] = {};
        }

        // Abort if vehicle does not have coordinates
        if (vehicle.longitude == null || vehicle.latitude == null) return; 

        // Add new vehicle object to cachedVehicles 
        if (!(id in cachedVehicles.lineRefs[vehicle.lineref])) {
            cachedVehicles.lineRefs[vehicle.lineref][id] = {
                latitude: vehicle.latitude, 
                longitude: vehicle.longitude, 
                timestamp: vehicle.recordedattime
            }
            return; 
        }

        // Reference to cached vehicle
        const cachedVeh = cachedVehicles.lineRefs[vehicle.lineref][id];
        
        // Abort if vehicle has stayed still and set hasMoved property to false
        if (cachedVeh.latitude === vehicle.latitude && cachedVeh.longitude === vehicle.longitude) {
            cachedVeh.hasMoved = false; 
            return; 
        }
    
        // Update vehicle details on cachedVehicles
        cachedVeh.oldLat = cachedVeh.latitude; 
        cachedVeh.oldLon = cachedVeh.longitude;
        cachedVeh.latitude = vehicle.latitude; 
        cachedVeh.longitude = vehicle.longitude; 
        cachedVeh.oldtimestamp = cachedVeh.timestamp;
        cachedVeh.timestamp = vehicle.recordedattime;
        cachedVeh.hasMoved = true; 

        // Calculate time in seconds that the vehicle has travelled
        cachedVeh.travelledTime = calculateTravellingTime(vehicle.recordedattime, cachedVeh.oldtimestamp);

        // Calculate distance in meters that the vehicle has travelled
        cachedVeh.travelledDistance = calculateTravellingDistance(
            { 
                latitude: cachedVeh.oldLat, 
                longitude: cachedVeh.oldLon
            },
            {
                latitude: vehicle.latitude, 
                longitude: vehicle.longitude
            }
        );
        
        // Calculate speed in km/h that the vehicle has travelled
        cachedVeh.speed = calculateTravellingSpeed(cachedVeh.travelledDistance, cachedVeh.travelledTime);

        // Re-assign vehicle in cachedVehicles
        cachedVehicles.lineRefs[vehicle.lineref][id] = cachedVeh; 

    });

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
    
    // Broadcast vehicles to websocket connections
    connectedSockets.forEach((socket) => {
        socket.send(JSON.stringify(cachedVehicles));
    });

  } catch (err) {
    console.error("Failed to fetch vehicles: ", err);
  }

} 

export function startPolling() {
    // Fetch vehicles on startup
    fetchVehicles(); 
    // Then fetch vehicles once every 5 seconds
    setInterval(fetchVehicles, 5000);
}

export function getVehicles() {
    return cachedVehicles;
}

