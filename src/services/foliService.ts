// Import geo functions
import { calculateTravellingTime, calculateTravellingDistance, calculateTravellingSpeed } from "../lib/geo.ts";
// Export set for connected web sockets
export const connectedSockets = new Set<WebSocket>(); 

// Föli API Types
type ApiResponse = {
    status?: string;
    servertime?: number;
    result: { vehicles: Record<string, ApiVehicle> }; 
}
type ApiVehicle = {
    lineref: string; 
    latitude: number | null;
    longitude: number | null; 
    recordedattime: number; 
}

// Vehicle Cache Types
type CachedVehicles = {
    status: string | undefined;
    servertime: number | null;
    vehiclesById: Record<VehicleId, CachedVehicle>;
}
type VehicleId = string; 
type CachedVehicle = {
    lineref: string; 
    latitude: number;
    longitude: number; 
    timestamp: number;
    oldtimestamp?: number; 
    oldLat?: number; 
    oldLon?: number;
    travelledTime: number; 
    travelledDistance: number; 
    speed: number; 
}

// Object to store cached vehicles
const cachedVehicles: CachedVehicles = {
    status: undefined, 
    servertime: null,
    vehiclesById: {},
}

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

    // Add response status and servertime to vehicles
    cachedVehicles.status = data.status ?? undefined; 
    cachedVehicles.servertime = data.servertime ?? null;  

    // Handle each vehicle 
    Object.entries(data.result.vehicles).forEach(([id, vehicle]) => {

        // Reference to cached vehicle 
        let cachedVeh = cachedVehicles.vehiclesById[id];
        
        // Abort if vehicle does not have coordinates
        if (vehicle.longitude == null || vehicle.latitude == null) return; 
        
        // Add new vehicle details to cachedVehicles
        if (!cachedVeh) {
            cachedVeh = {
                lineref: vehicle.lineref, 
                latitude: vehicle.latitude, 
                longitude: vehicle.longitude, 
                timestamp: vehicle.recordedattime
            };
            cachedVehicles.vehiclesById[id] = cachedVeh;
            return; 
        } 

        // Abort if vehicle has stayed still
        if (cachedVeh.latitude === vehicle.latitude && cachedVeh.longitude === vehicle.longitude) return; 
    
        // Update vehicle details on cachedVehicles
        cachedVeh.lineref = vehicle.lineref; 
        cachedVeh.oldLat = cachedVeh.latitude; 
        cachedVeh.oldLon = cachedVeh.longitude;
        cachedVeh.latitude = vehicle.latitude; 
        cachedVeh.longitude = vehicle.longitude; 
        cachedVeh.oldtimestamp = cachedVeh.timestamp;
        cachedVeh.timestamp = vehicle.recordedattime;

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

    });

    // Broadcast vehicles to websocket connections
    connectedSockets.forEach((socket) => {
        socket.send(JSON.stringify(cachedVehicles));
    });
    
  } catch (err) {
    console.error("Failed to fetch vehicles: ", err);
  }

} 

function startPolling() {
    // Fetch vehicles on startup
    fetchVehicles(); 
    // Then fetch vehicles once every 5 seconds
    setInterval(fetchVehicles, 5000);
}

function getVehicles() {
    return cachedVehicles;
}

export { startPolling, getVehicles };
