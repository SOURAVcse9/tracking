const socket = io();
let map = L.map("map").setView([0, 0], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(map);

let marker;

// Add a display element for coordinates
const coordsDisplay = document.createElement("div");
coordsDisplay.id = "coordsDisplay";
coordsDisplay.style.position = "absolute";
coordsDisplay.style.top = "10px";
coordsDisplay.style.left = "10px";
coordsDisplay.style.background = "white";
coordsDisplay.style.padding = "5px 10px";
coordsDisplay.style.borderRadius = "5px";
coordsDisplay.style.fontWeight = "bold";
document.body.appendChild(coordsDisplay);

// Listen for driver location from server
socket.on("receive-location", (data) => {
    const { latitude, longitude } = data;

    // Update coordinates display
    coordsDisplay.textContent = `Latitude: ${latitude.toFixed(6)}, Longitude: ${longitude.toFixed(6)}`;

    if (!marker) {
        marker = L.marker([latitude, longitude]).addTo(map);
    } else {
        marker.setLatLng([latitude, longitude]);
    }

    map.setView([latitude, longitude], 15);
});
