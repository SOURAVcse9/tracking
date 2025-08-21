// Leaflet map
const map = L.map("map").setView([0, 0], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

const busIdInput = document.getElementById("busId");
const trackBtn = document.getElementById("trackBtn");

const speedVal = document.getElementById("speedVal");
const distVal  = document.getElementById("distVal");
const etaVal   = document.getElementById("etaVal");

let myMarker = null;
let myAccuracy = null;
let busMarker = null;
let busPath = null;

let myPos = null;  // {lat,lng,time}
let unsubLast = null; // Firebase listener ref

// Watch my location (for distance/ETA)
if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      myPos = { lat: latitude, lng: longitude, time: Date.now() };

      if (myMarker) myMarker.setLatLng([latitude, longitude]);
      else myMarker = L.marker([latitude, longitude]).addTo(map).bindPopup("You");

      if (myAccuracy) myAccuracy.setLatLng([latitude, longitude]).setRadius(accuracy);
      else myAccuracy = L.circle([latitude, longitude], { radius: accuracy }).addTo(map);

      if (!map._meCentered) {
        map.setView([latitude, longitude], 15);
        map._meCentered = true;
      }
    },
    (err) => console.error("Geolocation error:", err),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 7000 }
  );
}

trackBtn.addEventListener("click", () => {
  const busId = busIdInput.value.trim();
  if (!busId) return alert("Please enter a Bus ID (e.g. bus1)");

  // Clean previous listener
  if (unsubLast) {
    unsubLast.off();
    unsubLast = null;
  }

  // Listen to current bus "last" node
  const lastRef = db.ref(`buses/${busId}/last`);
  lastRef.on("value", (snap) => {
    const val = snap.val();
    if (!val) return;

    const { lat, lng, speedKmh } = val;

    if (busMarker) busMarker.setLatLng([lat, lng]);
    else busMarker = L.marker([lat, lng]).addTo(map).bindPopup(`Bus: ${busId}`);

    if (!map._busCentered && !map._meCentered) {
      map.setView([lat, lng], 15);
      map._busCentered = true;
    }

    speedVal.textContent = Number(speedKmh || 0).toFixed(1);

    // Distance & ETA if I have my location
    if (myPos) {
      const d = haversineMeters(myPos.lat, myPos.lng, lat, lng); // meters
      distVal.textContent = d >= 1000 ? (d / 1000).toFixed(2) + " km" : `${Math.round(d)} m`;

      const etaSec = estimateETASeconds(d, speedKmh);
      const mm = Math.floor(etaSec / 60);
      const ss = etaSec % 60;
      etaVal.textContent = `${mm}m ${ss}s`;
    } else {
      distVal.textContent = "—";
      etaVal.textContent = "—";
    }
  });

  // Optional: show path
  const pathRef = db.ref(`buses/${busId}/path`).limitToLast(200);
  pathRef.on("child_added", (snap) => {
    const p = snap.val();
    if (!p) return;
    if (!busPath) busPath = L.polyline([[p.lat, p.lng]], { weight: 4 }).addTo(map);
    else busPath.addLatLng([p.lat, p.lng]);
  });

  unsubLast = lastRef; // so we can detach later if needed
});

// Utils
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function estimateETASeconds(distanceMeters, speedKmh) {
  // If speed unknown/very low, assume 18 km/h (city bus)
  const v = (speedKmh && speedKmh > 3) ? speedKmh : 18;
  const mps = v / 3.6;
  return Math.round(distanceMeters / mps);
}
