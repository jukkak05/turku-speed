// Import geolib 
import { getDistance } from "npm:geolib";

// Poll Föli API
let cachedVehicles = {
    vehicles: {}
}; 

const fetchVehicles = async () => {

    try {
        const res = await fetch('https://data.foli.fi/siri/vm');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Add response status and servertime 
        cachedVehicles.status = data.status; 
        cachedVehicles.servertime = data.servertime; 

        // Run for each returned vehicle object
        Object.entries(data.result.vehicles).forEach(([id, vehicle]) => {

            // If vehicle id is now known
            if (!cachedVehicles.vehicles[id]) {

                // Get new vehicle details
                cachedVehicles.vehicles[id] = {
                    lineref: vehicle.lineref, 
                    latitude: vehicle.latitude, 
                    longitude: vehicle.longitude, 
                    timestamp: vehicle.recordedattime
                };

            } else {

                // If vehicle is known, update the vehicle details
                cachedVehicles.vehicles[id].oldLat =  cachedVehicles.vehicles[id].latitude; 
                cachedVehicles.vehicles[id].oldLon =  cachedVehicles.vehicles[id].longitude; 
                cachedVehicles.vehicles[id].latitude = vehicle.latitude;
                cachedVehicles.vehicles[id].longitude = vehicle.longitude; 
                cachedVehicles.vehicles[id].oldTimestamp = cachedVehicles.vehicles[id].timestamp; 
                cachedVehicles.vehicles[id].timestamp = vehicle.recordedattime;

                // Calculate time in seconds the vehicle has travelled
                const travelledTime = cachedVehicles.vehicles[id].timestamp - cachedVehicles.vehicles[id].oldTimestamp;
                cachedVehicles.vehicles[id].travelledTime = travelledTime; 

                // If vehicle has not travelled at all or old lat/old long is not known, return
                if (
                    !travelledTime ||
                    !cachedVehicles.vehicles[id].oldLat ||
                    !cachedVehicles.vehicles[id].oldLon
                ) {
                    return;
                }

                // Calculate distance in meters the vehicle has travelled 
                const travelledDistance = getDistance( 
                    { latitude: cachedVehicles.vehicles[id].oldLat, longitude: cachedVehicles.vehicles[id].oldLon }, 
                    { latitude: vehicle.latitude, longitude: vehicle.longitude }
                ); 
                cachedVehicles.vehicles[id].travelledDistance = travelledDistance; 

                // Calculate speed that the vehicle has travelled
                const speedPerMSec = travelledDistance / travelledTime; 
                const speedPerKMHour = parseFloat(speedPerMSec * 3.6).toFixed(2); 
                cachedVehicles.vehicles[id].speed = speedPerKMHour;
                 
            }

        });

    } catch (err) {
        console.error('Failed to fetch vechiles:', err);
    }
}

export function startPolling() {
    // Fetch immediately on startup
    fetchVehicles(); 
    // Then poll api every 10 second
    setInterval(fetchVehicles, 10000);
}

export function getVehicles() {
    return cachedVehicles; 
}