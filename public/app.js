// src/client/app.ts
var markersByVehicleId = /* @__PURE__ */ new Map();
var groupsByLineref = /* @__PURE__ */ new Map();
var activeLineRefs = /* @__PURE__ */ new Set();
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
  websocket.onmessage = (e) => {
    try {
      const apiData = JSON.parse(e.data);
      if (apiData.status !== "OK") return;
      Object.entries(apiData.lineRefs).forEach(([lineref, vehicleIds]) => {
        let linerefGroup = groupsByLineref.get(lineref);
        if (!linerefGroup) {
          linerefGroup = L.layerGroup();
          groupsByLineref.set(lineref, linerefGroup);
        }
        Object.entries(vehicleIds).forEach(([id, vehicle]) => {
          let marker = markersByVehicleId.get(id);
          if (!marker) {
            marker = L.marker([
              vehicle.latitude,
              vehicle.longitude
            ]).bindPopup(`Line: ${lineref}<br>Nopeutta lasketaan...`);
            markersByVehicleId.set(id, marker);
            linerefGroup.addLayer(marker);
            map.addLayer(linerefGroup);
            return;
          }
          if (vehicle.hasMoved === true) {
            marker.setLatLng([
              vehicle.latitude,
              vehicle.longitude
            ]);
            marker.setPopupContent(`Linja: ${lineref}<br>Nopeus: ${vehicle.speed} km/h `);
          } else {
            marker.setPopupContent(`Linja: ${lineref}<br>Nopeus: 0 km/h `);
          }
          markersByVehicleId.set(id, marker);
        });
      });
    } catch (err) {
      console.error("Failed to handle api data: ", err);
    }
    const lineRefButtons = Array.from(document.querySelectorAll("button"));
    groupsByLineref.forEach((_, lineref) => {
      if (!lineRefButtons.some((button) => button.textContent?.trim() === lineref)) {
        const buttonElement = document.createElement("button");
        buttonElement.textContent = lineref;
        const lineRefButtonsContainer = document.getElementById("lineref-buttons");
        lineRefButtonsContainer?.appendChild(buttonElement);
      }
    });
    lineRefButtons.forEach((button) => {
      button.addEventListener("click", (e2) => {
        document.getElementById("all-linerefs")?.classList.remove("active");
        const target = e2.currentTarget;
        const buttonLineRef = target?.textContent?.trim() ?? "";
        if (!target?.classList.contains("active")) {
          target?.classList.add("active");
          activeLineRefs.add(buttonLineRef);
        } else {
          target?.classList.remove("active");
          activeLineRefs.delete(buttonLineRef);
        }
        map.eachLayer((layer) => {
          if (!(layer instanceof L.TileLayer)) {
            map.removeLayer(layer);
          }
        });
        groupsByLineref.forEach((layerGroup, lineref) => {
          if (activeLineRefs.has(lineref)) {
            map.addLayer(layerGroup);
          }
        });
      });
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
