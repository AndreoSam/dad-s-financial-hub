import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAz6DBBiz_Pyv_CZ6M5a7q_9VPOUP46Hdk",
  authDomain: "fd-tracker-58039.firebaseapp.com",
  projectId: "fd-tracker-58039",
  storageBucket: "fd-tracker-58039.firebasestorage.app",
  messagingSenderId: "930496453382",
  appId: "1:930496453382:web:35892e847454f660821c87",
  measurementId: "G-ER8EEJLN1L",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
