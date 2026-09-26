importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAGR2gzPDPBQgxMoEutDSIltJfEKBxhQE8",
  authDomain: "medknock-5acc8.firebaseapp.com",
  projectId: "medknock-5acc8",
  storageBucket: "medknock-5acc8.firebasestorage.app",
  messagingSenderId: "474622207890",
  appId: "1:474622207890:web:f500e0606069c294ffc34b",
  measurementId: "G-K7CQEPHLJF"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();


