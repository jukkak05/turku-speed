// Type declaration for Leaflet
import type * as Leaflet from "leaflet";
declare const L: typeof Leaflet;

// Import cachedVehicles type
import { CachedVehicles } from "../services/foliService.ts";

// Type aliases for lineref and vehicle id
type VehicleId = string;
type LineRef = string;

// Indexes for marker, group and line ref 
const markersByVehicleId = new Map<VehicleId, L.Marker>();
const groupsByLineref = new Map<LineRef, L.LayerGroup<L.Marker>>();
const activeLineRefs = new Set<LineRef>();

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

        try {

            // Parse json data
            const apiData = JSON.parse(e.data) as CachedVehicles;
            
            // If status is not ok, abort
            if (apiData.status !== 'OK') return;

            // Loop over each lineref
            Object.entries(apiData.lineRefs).forEach(([lineref, vehicleIds]) => {

                // Create and store Leaflet layer group for lineref
                let linerefGroup = groupsByLineref.get(lineref);
                if (!linerefGroup) {
                    linerefGroup = L.layerGroup();
                    groupsByLineref.set(lineref, linerefGroup);
                }

                // Loop over each vehicle
                Object.entries(vehicleIds).forEach(([id, vehicle]) => {
                    
                    // Reference to marker in markersByVehicleId
                    let marker = markersByVehicleId.get(id);

                    // Handle new vehicles
                    if (!marker) {
                        // Create leaflet marker based on vehicle latitude and longitude
                        marker = L.marker([vehicle.latitude, vehicle.longitude])
                        .bindPopup(`Line: ${lineref}<br>Nopeutta lasketaan...`);
                        markersByVehicleId.set(id, marker);
                        linerefGroup.addLayer(marker);
                        map.addLayer(linerefGroup);
                        return; 
                    }
            
                    // Update vehicle position and popup if it has moved
                    if (vehicle.hasMoved === true) {
                        marker.setLatLng([vehicle.latitude, vehicle.longitude]);
                        marker.setPopupContent(`Linja: ${lineref}<br>Nopeus: ${vehicle.speed} km/h `);
                    } else {
                        marker.setPopupContent(`Linja: ${lineref}<br>Nopeus: 0 km/h `);
                    }

                    // Update leaflet marker in markersByVehicleId
                    markersByVehicleId.set(id, marker);

                });
                
            });

        } catch (err) {
            console.error("Failed to handle api data: ", err);
        }
        
        // Add lineref buttons on page
        const lineRefButtons = Array.from(document.querySelectorAll('button'));
        groupsByLineref.forEach((_, lineref) => {
            if (!lineRefButtons.some(button => button.textContent?.trim() === lineref)) {
                const buttonElement = document.createElement('button');
                buttonElement.textContent = lineref; 
                const lineRefButtonsContainer = document.getElementById('lineref-buttons')
                lineRefButtonsContainer?.appendChild(buttonElement);
            }
        });

        // Toggle line refs on and off on click
        lineRefButtons.forEach(button => {
            button.addEventListener('click', (e) => {

                document.getElementById('all-linerefs')?.classList.remove('active');

                const target = e.currentTarget as HTMLButtonElement | null; 
                const buttonLineRef = target?.textContent?.trim() ?? ''; 
     
                if (!target?.classList.contains('active')) {
                    target?.classList.add('active');
                    activeLineRefs.add(buttonLineRef);
                } else {
                    target?.classList.remove('active');
                    activeLineRefs.delete(buttonLineRef);
                }

                // Remove all layers from map
                map.eachLayer(layer => {
                    if (!(layer instanceof L.TileLayer)) {
                        map.removeLayer(layer);
                    }
                });

                // Add all active layers on map
                groupsByLineref.forEach((layerGroup, lineref) => {
                    if (activeLineRefs.has(lineref)) {
                        map.addLayer(layerGroup);
                    }
                });
                
            });
        });


        // Object.keys(groupsByLineref).forEach(lineRef => {

        //     if (!lineRefButtons.some(button => button.textContent?.trim() === lineRef)) {
        //         const buttonElement = document.createElement('button');
        //         buttonElement.textContent = lineRef; 
        //         const lineRefButtonsContainer = document.getElementById('lineref-buttons')
        //         lineRefButtonsContainer?.appendChild(buttonElement);

        //         // Button click event 
        //         buttonElement.addEventListener('click', () => {
        //            Object.entries(groupsByLineref).forEach(([lineRef, layerGroup]) => {
                        
        //            }
        //         });

        //     }
        // });

        // if (!Array.from(document.querySelectorAll('button')).some(button => button.textContent?.trim() === lineref)) {
            
        //     const buttonElement = document.createElement('button');
        //     buttonElement.textContent = lineref; 
        //     const lineRefButtons = document.getElementById('lineref-buttons')
        //     lineRefButtons?.appendChild(buttonElement);

        //     // Button on click event 
        //     buttonElement.addEventListener('click', () => {

        //         map.eachLayer(function(layer){
        //             if (layer !== linerefGroup && !(layer instanceof L.TileLayer)) {
        //                 map.removeLayer(layer);
        //             }
        //         });

        //     });

        // }

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
