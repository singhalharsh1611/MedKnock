import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";


const firebaseConfig = {
  apiKey: "AIzaSyD5I1VezuQFjdby0cJ5AUlPpovCkN1NjK4",
  authDomain: "medknock-83db8.firebaseapp.com",
  projectId: "medknock-83db8",
  storageBucket: "medknock-83db8.firebasestorage.app",
  messagingSenderId: "92700829211",
  appId: "1:92700829211:web:78565d567a216dddbfbabe",
  measurementId: "G-PMLMVGPPEQ"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);