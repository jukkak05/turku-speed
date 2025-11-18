// Import geolib 
// Docs: https://www.npmjs.com/package/geolib
import { getDistance } from "npm:geolib";

// Object to store cached vehicles
let cachedVehicles = {
    vehicles: {}
}; 

const fetchVehicles = async () => {

    try {

        // Poll Föli API for vehicles data
        // Docs: https://data.foli.fi/doc/index
        const res = await fetch('https://data.foli.fi/siri/vm');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        console.log('New vehicles data fetched');

        // Add response status and servertime 
        cachedVehicles.status = data.status; 
        cachedVehicles.servertime = data.servertime; 

        // Run for each returned vehicle object
        Object.entries(data.result.vehicles).forEach(([id, vehicle]) => {

            // Abort if vehicle does not have coordinates
            if (!vehicle.longitude || !vehicle.latitude) {
                return; 
            }

            // If vehicle id is not known 
            if (!cachedVehicles.vehicles[id]) {

                // Get new vehicle details
                cachedVehicles.vehicles[id] = {
                    lineref: vehicle.lineref, 
                    latitude: vehicle.latitude, 
                    longitude: vehicle.longitude, 
                    timestamp: vehicle.recordedattime
                };

            } else {

                // Abort if vehicle has not travelled at all
                if (
                    cachedVehicles.vehicles[id].oldLat === vehicle.latitude || 
                    cachedVehicles.vehicles[id].oldLon === vehicle.longitude) 
                {
                    return; 
                }

                // Update vehicle details
                cachedVehicles.vehicles[id].oldLat =  cachedVehicles.vehicles[id].latitude; 
                cachedVehicles.vehicles[id].oldLon =  cachedVehicles.vehicles[id].longitude; 
                cachedVehicles.vehicles[id].latitude = vehicle.latitude;
                cachedVehicles.vehicles[id].longitude = vehicle.longitude; 
                cachedVehicles.vehicles[id].oldTimestamp = cachedVehicles.vehicles[id].timestamp; 
                cachedVehicles.vehicles[id].timestamp = vehicle.recordedattime;

                // Calculate time in seconds that the vehicle has travelled
                const travelledTime = cachedVehicles.vehicles[id].timestamp - cachedVehicles.vehicles[id].oldTimestamp;
                cachedVehicles.vehicles[id].travelledTime = travelledTime; 

                // Calculate distance in meters that the vehicle has travelled using geolib
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
        console.error('Failed to fetch vehicles', err);
    }
}

export function startPolling() {
    // Fetch immediately on startup
    fetchVehicles(); 
    // Then poll api every 7 sec
    setInterval(fetchVehicles, 7000);
}

export function getVehicles() {
    return cachedVehicles; 
}