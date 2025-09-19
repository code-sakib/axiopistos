// services/firebase.ts
import { initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC4uMmbsKfpuqO_0hcm39u9DJQrcKwX_Jo",
  authDomain: "xionpocproject.firebaseapp.com",
  projectId: "xionpocproject",
  storageBucket: "xionpocproject.firebasestorage.app",
  messagingSenderId: "913302625613",
  appId: "1:913302625613:web:b625890b24ff37ee8bab04",
  measurementId: "G-GV30G3FKH9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// helper to fetch products
export async function fetchProducts() {
  const querySnapshot = await getDocs(collection(db, "products/demo/items"));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
