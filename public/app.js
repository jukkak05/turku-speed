// src/client/app.ts
var markersByVehicleId = {};
document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("map").setView([
    60.4516703550171,
    22.248231325628893
  ], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  const websocket = new WebSocket("/api/vehicles");
  websocket.onopen = (e) => {
  };
  websocket.onmessage = (e) => {
    const apiData = JSON.parse(e.data);
    if (apiData.status !== "OK") return;
    apiData.lineRefs.forEach((lineref) => {
      if (!Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim() === lineref)) {
        const buttonElement = document.createElement("button");
        buttonElement.textContent = lineref;
        const lineRefButtons = document.getElementById("lineref-buttons");
        lineRefButtons?.appendChild(buttonElement);
      }
    });
    Object.entries(apiData.vehiclesById).forEach(([id, vehicle]) => {
      let marker = markersByVehicleId[id];
      if (!marker) {
        marker = L.marker([
          vehicle.latitude,
          vehicle.longitude
        ]).addTo(map).bindPopup(`Line: ${vehicle.lineref}<br>Nppeutta lasketaan...`);
      }
      if (vehicle.hasMoved === true) {
        marker.setLatLng([
          vehicle.latitude,
          vehicle.longitude
        ]);
        marker.setPopupContent(`Linja: ${vehicle.lineref}<br>Nopeus: ${vehicle.speed} km/h `);
      } else {
        marker.setPopupContent(`Linja: ${vehicle.lineref}<br>Nopeus: 0 km/h `);
      }
      markersByVehicleId[id] = marker;
    });
  };
  let darkmode = false;
  document.getElementById("dark-mode")?.addEventListener("click", (e) => {
    const button = e.currentTarget;
    if (darkmode === false) {
      document.querySelector("main").style.background = "#000000";
      document.querySelector("h1").style.color = "#ffffff";
      const paragraphs = document.querySelectorAll("p");
      paragraphs.forEach((p) => {
        p.style.color = "#ffffff";
      });
      darkmode = true;
      button.innerHTML = "Go F\xD6LI";
    } else {
      document.querySelector("main").style.background = "#f0b323";
      document.querySelector("h1").style.color = "#000000";
      const paragraphs = document.querySelectorAll("p");
      paragraphs.forEach((p) => {
        p.style.color = "#000000";
      });
      darkmode = false;
      button.innerHTML = "Go Dark";
    }
  });
});
