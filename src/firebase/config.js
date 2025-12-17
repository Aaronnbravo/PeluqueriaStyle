import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Tu configuración de Firebase para PisoStyle
const firebaseConfig = {
  apiKey: "AIzaSyCJG2F5DhqoupVjsjXwhfgwyETRAxzrU6A",
  authDomain: "pisostyle-barberia.firebaseapp.com",
  projectId: "pisostyle-barberia",
  storageBucket: "pisostyle-barberia.firebasestorage.app",
  messagingSenderId: "920117404748",
  appId: "1:920117404748:web:68e06b2786073f93b280e9",
  measurementId: "G-V38N17C1LX"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios que NECESITAS
export const db = getFirestore(app);    // Para Firestore Database
export const auth = getAuth(app);       // Para Authentication

// Analytics es OPCIONAL - puedes comentarlo si no lo usas
// import { getAnalytics } from "firebase/analytics";
// const analytics = getAnalytics(app);