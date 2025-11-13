// public/app.js - ~20 lines
const map = L.map('map').setView([60.45, 22.25], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const markers = {};

async function updateVehicles() {
  const res = await fetch('/api/vehicles');
  const vehicles = await res.json();
  
  vehicles.forEach(v => {
    if (!markers[v.id]) {
      markers[v.id] = L.marker([v.lat, v.lon]).addTo(map);
    } else {
      markers[v.id].setLatLng([v.lat, v.lon]);
    }
  });
}

setInterval(updateVehicles, 5000);
//updateVehicles();