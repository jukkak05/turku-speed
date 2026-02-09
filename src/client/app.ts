// Type declaration for Leaflet
import type * as Leaflet from "leaflet";
declare const L: typeof Leaflet;

// Import cachedVehicles type
import { CachedVehicles } from "../services/foliService.ts";

// Type aliases for lineref and vehicle id
type VehicleId = string;
type LineRef = string;

// Indexes for marker, group, line ref and 
const markersByVehicleId = new Map<VehicleId, L.Marker>();
const groupsByLineref = new Map<LineRef, L.LayerGroup<L.Marker>>();
const activeLineRefs = new Set<LineRef>();

// Event listener for dom content loaded
document.addEventListener("DOMContentLoaded", () => {

    // Initialize Leaflet Map
    // https://leafletjs.com/reference.html
    const map = initializeLeafletMap(); 

    // Create websocket connection to the api server
    const websocket = new WebSocket('/api/vehicles');

    // Websocket on message event
    websocket.onmessage = (e) => {

        try {

            // Parse json data
            const apiData = JSON.parse(e.data) as CachedVehicles;
            
            // If status is not ok, abort
            if (apiData.status !== 'OK') return;

            // Populate Leaflet Map with vehicle markers and line ref buttons
            populateLeafletMap(apiData, map); 

        } catch (err) {
            console.error("Failed to handle api data: ", err);
        }
        
    };

    // Dark mode
    darkmode(); 

    // All line refs button
    allLineRefsButton(map); 

});

function initializeLeafletMap() {
    // Build the map with Turku coordinates
    const map = L.map('map').setView([60.4516703550171, 22.248231325628893], 13);
    // Add open street map tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    return map; 
}

function populateLeafletMap(apiData: CachedVehicles, map: L.Map) {

    // Loop over each lineref
    Object.entries(apiData.lineRefs).forEach(([lineref, vehicleIds]) => {

        // Create Leaflet layer group and button for line ref
        let linerefGroup = groupsByLineref.get(lineref);
        if (!linerefGroup) {
            linerefGroup = L.layerGroup();
            groupsByLineref.set(lineref, linerefGroup);
            addLineRefButton(lineref, map);
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

}

function addLineRefButton(lineref: LineRef, map: L.Map) {

    const buttonElement = document.createElement('button');
    buttonElement.textContent = lineref; 
    const lineRefButtonsContainer = document.getElementById('lineref-buttons')
    lineRefButtonsContainer?.appendChild(buttonElement);

    // Toggle line refs on and off on click
    buttonElement.addEventListener('click', () => {

        document.getElementById('all-linerefs')?.classList.remove('active');

        if ( buttonElement.classList.contains('active') ) {
            buttonElement.classList.remove('active');
            activeLineRefs.delete(lineref);
        } else {
            buttonElement.classList.add('active');
            activeLineRefs.add(lineref);
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

}

function allLineRefsButton(map: L.Map) {
    const buttonElement = document.getElementById('all-linerefs'); 
    buttonElement?.addEventListener('click', () => {
        buttonElement?.classList.add('active');
        document.querySelectorAll('#lineref-buttons button:not(#all-linerefs)').forEach(button => {
            button.classList.remove('active');
        });
        activeLineRefs.clear(); 
        groupsByLineref.forEach((layerGroup) => {
            map.addLayer(layerGroup);
        });
    });
}

function darkmode() {
    const darkButton = document.getElementById('go-dark'); 
    const dayButton = document.getElementById('go-day'); 

    darkButton?.addEventListener('click', () => {
        darkButton?.classList.add('hidden');
        dayButton?.classList.remove('hidden');
        document.body.classList.add('dark');
    });
    
    dayButton?.addEventListener('click', () => {
        dayButton?.classList.add('hidden');
        darkButton?.classList.remove('hidden');
        document.body.classList.remove('dark');
    });
}
