// src/client/app.ts
var markersByVehicleId = /* @__PURE__ */ new Map();
var groupsByLineref = /* @__PURE__ */ new Map();
var activeLineRefs = /* @__PURE__ */ new Set();
document.addEventListener("DOMContentLoaded", () => {
  const map = initializeLeafletMap();
  const websocket = new WebSocket("/api/vehicles");
  websocket.onmessage = (e) => {
    try {
      const apiData = JSON.parse(e.data);
      if (apiData.status !== "OK") return;
      populateLeafletMap(apiData, map);
    } catch (err) {
      console.error("Failed to handle api data: ", err);
    }
  };
  darkmode();
  allLineRefsButton(map);
});
function initializeLeafletMap() {
  const map = L.map("map").setView([
    60.4516703550171,
    22.248231325628893
  ], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  return map;
}
function populateLeafletMap(apiData, map) {
  Object.entries(apiData.lineRefs).forEach(([lineref, vehicleIds]) => {
    let linerefGroup = groupsByLineref.get(lineref);
    if (!linerefGroup) {
      linerefGroup = L.layerGroup();
      groupsByLineref.set(lineref, linerefGroup);
      addLineRefButton(lineref, map);
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
}
function addLineRefButton(lineref, map) {
  const buttonElement = document.createElement("button");
  buttonElement.textContent = lineref;
  const lineRefButtonsContainer = document.getElementById("lineref-buttons");
  lineRefButtonsContainer?.appendChild(buttonElement);
  buttonElement.addEventListener("click", () => {
    document.getElementById("all-linerefs")?.classList.remove("active");
    if (buttonElement.classList.contains("active")) {
      buttonElement.classList.remove("active");
      activeLineRefs.delete(lineref);
    } else {
      buttonElement.classList.add("active");
      activeLineRefs.add(lineref);
    }
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });
    groupsByLineref.forEach((layerGroup, lineref2) => {
      if (activeLineRefs.has(lineref2)) {
        map.addLayer(layerGroup);
      }
    });
  });
}
function allLineRefsButton(map) {
  const buttonElement = document.getElementById("all-linerefs");
  buttonElement?.addEventListener("click", () => {
    buttonElement?.classList.add("active");
    document.querySelectorAll("#lineref-buttons button:not(#all-linerefs)").forEach((button) => {
      button.classList.remove("active");
    });
    activeLineRefs.clear();
    groupsByLineref.forEach((layerGroup) => {
      map.addLayer(layerGroup);
    });
  });
}
function darkmode() {
  let darkmode2 = false;
  document.getElementById("dark-mode")?.addEventListener("click", (e) => {
    const button = e.currentTarget;
    if (darkmode2 === false) {
      document.querySelector("main").style.background = "#000000";
      document.querySelector("h1").style.color = "#ffffff";
      const paragraphs = document.querySelectorAll("p");
      paragraphs.forEach((p) => {
        p.style.color = "#ffffff";
      });
      darkmode2 = true;
      button.innerHTML = "Go F\xD6LI";
    } else {
      document.querySelector("main").style.background = "#f0b323";
      document.querySelector("h1").style.color = "#000000";
      const paragraphs = document.querySelectorAll("p");
      paragraphs.forEach((p) => {
        p.style.color = "#000000";
      });
      darkmode2 = false;
      button.innerHTML = "Go Dark";
    }
  });
}
