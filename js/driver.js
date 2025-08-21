// Leaflet map
const map = L.map("map").setView([0, 0], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

const busIdInput = document.getElementById("busId");
const startBtn = document.getElementById("startBtn");
const endBtn   = document.getElementById("endBtn");
const statusBadge = document.getElementById("statusBadge");

let myMarker = null;
let accuracyCircle = null;
let watchId = null;
let currentBusId = null;
let lastPoint = null; // {lat,lng,time}

startBtn.addEventListener("click", () => {
  const busId = busIdInput.value.trim();
  if (!busId) return alert("Please enter a Bus ID (e.g. bus1)");
  currentBusId = busId;

  // Mark bus as started
  db.ref(`buses/${busId}/status`).set("live");

  if (!("geolocation" in navigator)) {
    alert("Geolocation is not supported on this device.");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const now = Date.now();

      // Speed calculation
      let speedKmh = 0;
      if (lastPoint) {
        const dt = (now - lastPoint.time) / 1000; // sec
        if (dt > 0) {
          const dist = haversineMeters(lastPoint.lat, lastPoint.lng, latitude, longitude);
          speedKmh = (dist / dt) * 3.6;
        }
      }
      // Fallback to small speed if GPS jitter
      if (speedKmh < 0.5) speedKmh = 0;

      // Map visuals
      if (myMarker) myMarker.setLatLng([latitude, longitude]);
      else myMarker = L.marker([latitude, longitude]).addTo(map).bindPopup("Bus");

      if (accuracyCircle) {
        accuracyCircle.setLatLng([latitude, longitude]).setRadius(accuracy);
      } else {
        accuracyCircle = L.circle([latitude, longitude], { radius: accuracy }).addTo(map);
      }
      if (!map._centeredOnce) {
        map.setView([latitude, longitude], 16);
        map._centeredOnce = true;
      }

      // Write to Firebase
      db.ref(`buses/${busId}/last`).set({
        lat: latitude,
        lng: longitude,
        time: now,
        speedKmh: Number(speedKmh.toFixed(1))
      });

      // Optionally keep simple path history (comment out if not needed)
      db.ref(`buses/${busId}/path`).push({ lat: latitude, lng: longitude, time: now });

      lastPoint = { lat: latitude, lng: longitude, time: now };
    },
    (err) => console.error("Geolocation error:", err),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 7000 }
  );

  startBtn.disabled = true;
  endBtn.disabled = false;
  statusBadge.textContent = "live";
  statusBadge.className = "badge text-bg-success";
});

endBtn.addEventListener("click", () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (currentBusId) {
    db.ref(`buses/${currentBusId}/status`).set("ended");
  }
  startBtn.disabled = false;
  endBtn.disabled = true;
  statusBadge.textContent = "ended";
  statusBadge.className = "badge text-bg-secondary";
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
