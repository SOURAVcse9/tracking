// js/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyCFQaWqjrc5pNThxLzcRWi1meo6B75EMSk",
  authDomain: "bustracking-23f7e.firebaseapp.com",
  databaseURL: "https://bustracking-23f7e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bustracking-23f7e",
  storageBucket: "bustracking-23f7e.firebasestorage.app",
  messagingSenderId: "963391518922",
  appId: "1:963391518922:web:51413863866a719f7a5c33",
};

// initialize Firebase and Realtime Database
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();