// src/client/app.ts
var markersByVehicleId = {};
document.addEventListener("DOMContentLoaded", () => {
  var map = L.map("map").setView([
    60.4516703550171,
    22.248231325628893
  ], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  const websocket = new WebSocket("/api/vehicles");
  websocket.onmessage = (e) => {
    const apiData = JSON.parse(e.data);
    if (apiData.status !== "OK") return;
    Object.entries(apiData.vehiclesById).forEach(([id, vehicle]) => {
      let marker = markersByVehicleId[id];
      if (!marker) {
        marker = L.marker([
          vehicle.latitude,
          vehicle.longitude
        ]).addTo(map).bindPopup(`Line: ${vehicle.lineref}<br>Calculating speed...`);
      }
      if (vehicle.hasMoved === true) {
        marker.setLatLng([
          vehicle.latitude,
          vehicle.longitude
        ]);
        marker.setPopupContent(`Line: ${vehicle.lineref}<br>Speed: ${vehicle.speed} km/h `);
      } else {
        marker.setPopupContent(`Line: ${vehicle.lineref}<br>Speed: 0 km/h `);
      }
      markersByVehicleId[id] = marker;
    });
  };
});
