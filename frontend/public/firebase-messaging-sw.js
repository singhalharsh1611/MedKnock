importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyD5I1VezuQFjdby0cJ5AUlPpovCkN1NjK4",
  authDomain: "medknock-83db8.firebaseapp.com",
  projectId: "medknock-83db8",
  storageBucket: "medknock-83db8.firebasestorage.app",
  messagingSenderId: "92700829211",
  appId: "1:92700829211:web:78565d567a216dddbfbabe",
  measurementId: "G-PMLMVGPPEQ"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();