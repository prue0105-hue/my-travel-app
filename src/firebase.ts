// 1. 導入必要的工具
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // 🚀 這裡就是之前報錯少掉的工具
import { getStorage } from "firebase/storage"; // 🌟 1. 引入 Storage
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // 🌟 1. 引入驗證模組

// 2. 這是你的專屬通訊錄 (保持不變)
const firebaseConfig = {
  apiKey: "AIzaSyD9AZdjg5EEIJLHtMgrynPt9TP1gsVzAn4",
  authDomain: "travel-app-29a9b.firebaseapp.com",
  projectId: "travel-app-29a9b",
  storageBucket: "travel-app-29a9b.firebasestorage.app",
  messagingSenderId: "1078364253773",
  appId: "1:1078364253773:web:dd37fc86e4a36cdd81f604"
};

// 3. 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 4. 初始化資料庫，並加上 "export" 讓 App.tsx 能抓到它
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); // 🌟 2. 匯出 auth
export const googleProvider = new GoogleAuthProvider(); // 🌟 3. 匯出 Google 登入器