// Type declaration for Leaflet
import type * as Leaflet from "leaflet";
declare const L: typeof Leaflet;

// Import cachedVehicles type
import { CachedVehicles } from "../services/foliService.ts";

// Object to store markersByVehicleId
const markersByVehicleId = {};

// Object to store leaflet groups by lineref with markers
const groupsByLineref: Record<string, L.LayerGroup<L.Marker>> = {};

// Set to store hidden linerefs
const hiddenLinerefs = new Set<string>();

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

    // Websocket on message event
    websocket.onmessage = (e) => {
        
        // Parse json data
        const apiData = JSON.parse(e.data) as CachedVehicles;
        
        // If status is not ok, abort
        if (apiData.status !== 'OK') return;

        // Loop over each lineref
        Object.entries(apiData.lineRefs).forEach(([lineref, vehicleIds]) => {

            // Create and store Leaflet layer group for lineref
            const linerefGroup = groupsByLineref[lineref] ?? (groupsByLineref[lineref] = L.layerGroup());

            // Loop over each vehicle
            Object.entries(vehicleIds).forEach(([id, vehicle]) => {
                
                // Store new vehicles and add them to map
                let marker = markersByVehicleId[id];
                if (!marker) {
                    marker = L.marker([vehicle.latitude, vehicle.longitude])
                    .bindPopup(`Line: ${lineref}<br>Nopeutta lasketaan...`);
                }
        
                // Update vehicle position and popup
                if (vehicle.hasMoved === true) {
                    marker.setLatLng([vehicle.latitude, vehicle.longitude]);
                    marker.setPopupContent(`Linja: ${lineref}<br>Nopeus: ${vehicle.speed} km/h `);
                } else {
                    marker.setPopupContent(`Linja: ${lineref}<br>Nopeus: 0 km/h `);
                }

                // Store leaflet marker and layer group
                markersByVehicleId[id] = marker; 
                linerefGroup.addLayer(marker);

                // Add layer group to map
                if (!map.hasLayer(linerefGroup) && !hiddenLinerefs.has(lineref)) {
                    map.addLayer(linerefGroup);
                }

                // Add lineref buttons to page
                if (!Array.from(document.querySelectorAll('button')).some(button => button.textContent?.trim() === lineref)) {
                    
                    const buttonElement = document.createElement('button');
                    buttonElement.textContent = lineref; 
                    const lineRefButtons = document.getElementById('lineref-buttons')
                    lineRefButtons?.appendChild(buttonElement);

                    // Button on click event 
                    buttonElement.addEventListener('click', () => {

                       map.eachLayer(function(layer){
                            if (layer !== linerefGroup && !(layer instanceof L.TileLayer)) {
                                map.removeLayer(layer);
                            }
                       });

                    });

                }

            });

            // console.log(markersByVehicleId);
            // console.log(groupsByLineref);
            
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
