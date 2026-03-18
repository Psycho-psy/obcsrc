// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8ZiEuC0EWgLwn47qMUgyE-bdrOTzBm3c",
  authDomain: "knustobc-src.firebaseapp.com",
  databaseURL: "https://knustobc-src-default-rtdb.firebaseio.com",
  projectId: "knustobc-src",
  storageBucket: "knustobc-src.firebasestorage.app",
  messagingSenderId: "719112734540",
  appId: "1:719112734540:web:5580eb9c92aa31089b31e9"
};

const app = initializeApp(firebaseConfig);

// Export Realtime Database
export const db = getDatabase(app);
