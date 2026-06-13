// src/config/firebase.ts

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
  updateEmail,
  updateProfile,
  type User,
  type UserCredential,
  ActionCodeSettings
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  addDoc,
  writeBatch,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type WhereFilterOp
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  listAll,
  type UploadTask
} from 'firebase/storage';

// ==========================================
// إعدادات Firebase من متغيرات البيئة
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyAk54yJdFpHjwVMxdy4V8tTzi2eKREP34g",
  authDomain: "nexmeet-ux.firebaseapp.com",
  projectId: "nexmeet-ux",
  storageBucket: "nexmeet-ux.firebasestorage.app",
  messagingSenderId: "738640921104",
  appId: "1:738640921104:web:896450f84c401cc3560095",
  measurementId: "G-JXS7C8VBMC"
};

// التحقق من وجود المتغيرات
const missingVars: string[] = [];
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) missingVars.push(key);
});

if (missingVars.length > 0) {
  console.error('⚠️ Firebase configuration missing variables:', missingVars);
}

// ==========================================
// تهيئة خدمات Firebase
// ==========================================

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// تعيين اللغة العربية
auth.useDeviceLanguage();

// ==========================================
// إعدادات رابط تسجيل الدخول السحري (Magic Link)
// ==========================================

export const magicLinkSettings: ActionCodeSettings = {
  url: `${window.location.origin}/login`,
  handleCodeInApp: true,
  iOS: {
    bundleId: 'com.uexperts.app'
  },
  android: {
    packageName: 'com.uexperts.app',
    installApp: true,
    minimumVersion: '12'
  },
  dynamicLinkDomain: 'uexperts.page.link'
};

// ==========================================
// دوال المصادقة المتقدمة
// ==========================================

/**
 * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
 */
export const loginWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // تحديث وقت آخر تسجيل دخول
    const userRef = doc(db, 'users', result.user.uid);
    await updateDoc(userRef, { lastLoginAt: Date.now() });
    return result;
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    throw error;
  }
};

/**
 * إرسال رابط سحري لتسجيل الدخول (Magic Link)
 */
export const sendMagicLink = async (email: string): Promise<void> => {
  try {
    await sendSignInLinkToEmail(auth, email, magicLinkSettings);
    window.localStorage.setItem('emailForSignIn', email);
  } catch (error) {
    console.error('خطأ في إرسال الرابط السحري:', error);
    throw error;
  }
};

/**
 * التحقق من وجود رابط سحري وتسجيل الدخول من خلاله
 */
export const signInWithMagicLink = async (): Promise<UserCredential | null> => {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('يرجى إدخال بريدك الإلكتروني لإكمال تسجيل الدخول');
    }
    if (email) {
      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        return result;
      } catch (error) {
        console.error('خطأ في تسجيل الدخول بالرابط السحري:', error);
        throw error;
      }
    }
  }
  return null;
};

/**
 * إرسال رابط إعادة تعيين كلمة المرور
 */
export const resetUserPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('خطأ في إرسال رابط إعادة التعيين:', error);
    throw error;
  }
};

/**
 * تحديث كلمة مرور المستخدم الحالي
 */
export const changeUserPassword = async (newPassword: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('لا يوجد مستخدم مسجل الدخول');
  try {
    await updatePassword(user, newPassword);
  } catch (error) {
    console.error('خطأ في تحديث كلمة المرور:', error);
    throw error;
  }
};

/**
 * تحديث البريد الإلكتروني للمستخدم الحالي
 */
export const changeUserEmail = async (newEmail: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('لا يوجد مستخدم مسجل الدخول');
  try {
    await updateEmail(user, newEmail);
    await sendEmailVerification(user);
  } catch (error) {
    console.error('خطأ في تحديث البريد الإلكتروني:', error);
    throw error;
  }
};

/**
 * تحديث اسم المستخدم
 */
export const updateUserDisplayName = async (displayName: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('لا يوجد مستخدم مسجل الدخول');
  try {
    await updateProfile(user, { displayName });
  } catch (error) {
    console.error('خطأ في تحديث الاسم:', error);
    throw error;
  }
};

/**
 * إرسال تأكيد البريد الإلكتروني
 */
export const sendEmailVerificationLink = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('لا يوجد مستخدم مسجل الدخول');
  try {
    await sendEmailVerification(user);
  } catch (error) {
    console.error('خطأ في إرسال رابط التأكيد:', error);
    throw error;
  }
};

// ==========================================
// دوال Firestore المتقدمة
// ==========================================

/**
 * إنشاء مستند جديد في مجموعة
 */
export const createDocument = async <T extends DocumentData>(
  collectionName: string,
  data: T,
  customId?: string
): Promise<string> => {
  try {
    const collectionRef = collection(db, collectionName);
    let docRef;
    if (customId) {
      docRef = doc(collectionRef, customId);
      await setDoc(docRef, { ...data, createdAt: Date.now(), updatedAt: Date.now() });
    } else {
      docRef = await addDoc(collectionRef, { ...data, createdAt: Date.now(), updatedAt: Date.now() });
    }
    return docRef.id;
  } catch (error) {
    console.error(`خطأ في إنشاء مستند في ${collectionName}:`, error);
    throw error;
  }
};

/**
 * تحديث مستند موجود
 */
export const updateDocument = async <T extends Partial<DocumentData>>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, { ...data, updatedAt: Date.now() });
  } catch (error) {
    console.error(`خطأ في تحديث مستند في ${collectionName}:`, error);
    throw error;
  }
};

/**
 * حذف مستند
 */
export const deleteDocument = async (collectionName: string, docId: string): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`خطأ في حذف مستند من ${collectionName}:`, error);
    throw error;
  }
};

/**
 * جلب مستند حسب المعرف
 */
export const getDocument = async <T>(collectionName: string, docId: string): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`خطأ في جلب مستند من ${collectionName}:`, error);
    throw error;
  }
};

/**
 * جلب مستندات حسب استعلام
 */
export const queryDocuments = async <T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> => {
  try {
    const collectionRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
  } catch (error) {
    console.error(`خطأ في استعلام مستندات من ${collectionName}:`, error);
    throw error;
  }
};

/**
 * الاستماع إلى التغييرات في الوقت الفعلي
 */
export const subscribeToCollection = <T>(
  collectionName: string,
  callback: (data: T[]) => void,
  constraints: QueryConstraint[] = []
): () => void => {
  const collectionRef = collection(db, collectionName);
  const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
    callback(data);
  }, (error) => {
    console.error(`خطأ في الاستماع إلى ${collectionName}:`, error);
  });
};

/**
 * تنفيذ عمليات متعددة في دفعة واحدة
 */
export const executeBatch = async (operations: Array<{
  type: 'set' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: any;
}>): Promise<void> => {
  try {
    const batch = writeBatch(db);
    for (const op of operations) {
      const docRef = doc(db, op.collection, op.docId);
      if (op.type === 'set' && op.data) {
        batch.set(docRef, op.data);
      } else if (op.type === 'update' && op.data) {
        batch.update(docRef, op.data);
      } else if (op.type === 'delete') {
        batch.delete(docRef);
      }
    }
    await batch.commit();
  } catch (error) {
    console.error('خطأ في تنفيذ العمليات المجمعة:', error);
    throw error;
  }
};

// ==========================================
// دوال Firebase Storage
// ==========================================

/**
 * رفع ملف إلى التخزين السحابي
 */
export const uploadFile = async (
  path: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    if (onProgress) {
      uploadTask.on('state_changed', (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      });
    }
    
    await uploadTask;
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('خطأ في رفع الملف:', error);
    throw error;
  }
};

/**
 * حذف ملف من التخزين السحابي
 */
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('خطأ في حذف الملف:', error);
    throw error;
  }
};

/**
 * جلب جميع الملفات في مجلد
 */
export const listFiles = async (folderPath: string): Promise<string[]> => {
  try {
    const folderRef = ref(storage, folderPath);
    const result = await listAll(folderRef);
    const urls = await Promise.all(result.items.map(async (item) => {
      return await getDownloadURL(item);
    }));
    return urls;
  } catch (error) {
    console.error('خطأ في جلب قائمة الملفات:', error);
    throw error;
  }
};

// ==========================================
// دوال مساعدة إضافية
// ==========================================

/**
 * إنشاء مسار فريد للملفات
 */
export const generateStoragePath = (userId: string, folder: string, fileName: string): string => {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${folder}/${userId}/${timestamp}_${sanitizedName}`;
};

/**
 * التحقق من اتصال Firebase
 */
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    const testRef = doc(db, '_test_connection', 'test');
    await setDoc(testRef, { test: true, timestamp: Date.now() });
    await deleteDoc(testRef);
    return true;
  } catch (error) {
    console.error('فشل الاتصال بـ Firebase:', error);
    return false;
  }
};

/**
 * تصدير جميع الخدمات
 */
export default {
  auth,
  db,
  storage,
  loginWithEmail,
  sendMagicLink,
  signInWithMagicLink,
  resetUserPassword,
  changeUserPassword,
  changeUserEmail,
  updateUserDisplayName,
  sendEmailVerificationLink,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocument,
  queryDocuments,
  subscribeToCollection,
  executeBatch,
  uploadFile,
  deleteFile,
  listFiles,
  generateStoragePath,
  checkFirebaseConnection
};