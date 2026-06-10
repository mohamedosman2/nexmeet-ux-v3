// ==========================================
// ملف تهيئة الاتصال بخوادم Firebase
// ==========================================
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// مفاتيح مشروعك الأصلية (nexmeet-ux)
const firebaseConfig = {
  apiKey: "AIzaSyAk54yJdFpHjwVMxdy4V8tTzi2eKREP34g",
  authDomain: "nexmeet-ux.firebaseapp.com",
  projectId: "nexmeet-ux",
  storageBucket: "nexmeet-ux.firebasestorage.app",
  messagingSenderId: "738640921104",
  appId: "1:738640921104:web:896450f84c401cc3560095",
  measurementId: "G-JXS7C8VBMC"
};

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// تصدير الخدمات لاستخدامها في باقي النظام
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);