// Type declaration for Leaflet
import type * as Leaflet from "leaflet";
declare const L: typeof Leaflet;

// Import cachedVehicles type
import { CachedVehicles } from "../services/foliService.ts";

// Object to store leaflet markers
const markersByVehicleId: Record<string, L.Marker> = {};

// Event listener for dom content loaded
document.addEventListener("DOMContentLoaded", () => {

    // Initialize leaflet map
    const map = L.map('map').setView([60.4516703550171, 22.248231325628893], 13);

    // Add open street map tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Create websocket connection to the api server
    const websocket = new WebSocket('/api/vehicles');

    websocket.onopen = (e) => {
        
    }

    // Websocket on message event
    websocket.onmessage = (e) => {
        
        // Parse json data
        const apiData = JSON.parse(e.data) as CachedVehicles;
        
        // If status is not ok, abort
        if (apiData.status !== 'OK') return;

        // Add button for each lineref to show/hide it's vehicles
        apiData.lineRefs.forEach(lineref => {

            // Only if lineref button is not already on page
            if (!Array.from(document.querySelectorAll('button')).some(button => button.textContent?.trim() === lineref)) {
                const buttonElement = document.createElement('button');
                buttonElement.textContent = lineref; 
                const lineRefButtons = document.getElementById('lineref-buttons')
                lineRefButtons?.appendChild(buttonElement);
            }
           
        });

        // Handle new and moving vehicles
        Object.entries(apiData.vehiclesById).forEach(([id, vehicle]) => {

            // Reference to leaflet marker
            let marker = markersByVehicleId[id];

            // Store new vehicles and add them to map
            if (!marker) {
                marker = L.marker([vehicle.latitude, vehicle.longitude])
                .addTo(map)
                .bindPopup(`Line: ${vehicle.lineref}<br>Nppeutta lasketaan...`);
            } 

            // Update vehicle position and popup
            if (vehicle.hasMoved === true) {
                marker.setLatLng([vehicle.latitude, vehicle.longitude]);
                marker.setPopupContent(`Linja: ${vehicle.lineref}<br>Nopeus: ${vehicle.speed} km/h `);
            } else {
                marker.setPopupContent(`Linja: ${vehicle.lineref}<br>Nopeus: 0 km/h `);
            }

            // Store leaflet markers 
            markersByVehicleId[id] = marker; 

        });

    };

    // Dark mode
    let darkmode = false; 
    document.getElementById('dark-mode')?.addEventListener('click', (e) => {
        
        const button = e.currentTarget as HTMLButtonElement;

        if (darkmode === false) {
            document.querySelector('main')!.style.background = '#000000';
            document.querySelector('h1')!.style.color = '#ffffff';
            const paragraphs =  document.querySelectorAll('p');
            paragraphs.forEach(p => {
                p.style.color = '#ffffff';
            });
            darkmode = true; 
            button.innerHTML = 'Go FÖLI';
        } else {
            document.querySelector('main')!.style.background = '#f0b323';
            document.querySelector('h1')!.style.color = '#000000';
            const paragraphs =  document.querySelectorAll('p');
            paragraphs.forEach(p => {
                p.style.color = '#000000';
            });
            darkmode = false;
            button.innerHTML = 'Go Dark'; 
        }
      
    });

});
