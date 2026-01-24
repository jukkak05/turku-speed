/// <reference types="leaflet" />

// Import cachedVehicles type
import { CachedVehicles, getVehicles } from "../services/foliService.ts";

// Object to store leaflet markers
const markersByVehicleId: Record<string, L.Marker> = {};

// Event listener for dom content loaded
document.addEventListener("DOMContentLoaded", () => {

    // Initialize leaflet map
    var map = L.map('map').setView([60.4516703550171, 22.248231325628893], 13);

    // Add open street map tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Create websocket connection to the api server
    const websocket = new WebSocket('/api/vehicles');

    // Websocket on message event
    websocket.onmessage = (e) => {

        // Parse json data
        const apiData = JSON.parse(e.data) as CachedVehicles;
        
        // If status is not ok, abort
        if (apiData.status !== 'OK') return;

        // Handle new and moved vehicles
        Object.entries(apiData.vehiclesById).forEach(([id, vehicle]) => {

            // Reference to leaflet marker
            let marker = markersByVehicleId[id];

            // Store new vehicles and add them to map
            if (!marker) {
                marker = L.marker([vehicle.latitude, vehicle.longitude])
                .addTo(map)
                .bindPopup(`Line: ${vehicle.lineref}<br>Calculating speed...`);
            } else {
                // Update vehicle position and popup when it has moved
                marker.setLatLng([vehicle.latitude, vehicle.longitude]);
                marker.setPopupContent(`Line: ${vehicle.lineref}<br>Speed: ${vehicle.speed} km/h `)
            }

            // Store leaflet markers 
            markersByVehicleId[id] = marker; 

        });

        // Store id's of known vehicles and moved vehicles to an array
        const knownVehicleIds: Array = Object.keys(markersByVehicleId);
        const movedVehicleIds: Array = Object.keys(apiData.vehiclesById);

        // Handle vehicles standing still
        const standingVehicles = knownVehicleIds.filter((id) => !movedVehicleIds.includes(id));
        console.log('Standing vehicles');
        console.log(standingVehicles);


    };

});



// When websocket connection has been opened
// websocket.onopen = () => {
//     console.log('Connection opened!');
// };