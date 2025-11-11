// Create Leaflet map
// https://leafletjs.com/examples/quick-start/
var map = L.map('map').setView([60.451796910489584, 22.250983182266076], 13);

// Add OpenStreetMap Tile Layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);