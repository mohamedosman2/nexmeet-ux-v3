import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isPending: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          let profileData: UserProfile | null = null;
          const uidRef = doc(db, "users", user.uid);
          const uidSnap = await getDoc(uidRef);
          
          if (uidSnap.exists()) {
            profileData = uidSnap.data() as UserProfile;
          } else {
            profileData = {
              uid: user.uid,
              email: user.email || '',
              name: user.email?.split('@')[0] || 'مستخدم',
              phone: '',
              department: 'الإدارة العليا',
              primaryRole: 'employee',
              additionalTitles: [],
              isActive: false
            };
            // إنشاء الملف بصمت
            setDoc(uidRef, profileData).catch(e => console.warn("تم تخطي إنشاء الملف", e));
          }

          // ترقية إجبارية للمدير
          if (user.email?.toLowerCase() === 'm.othman@uexperts.sa' && profileData) {
            profileData.isActive = true;
            profileData.primaryRole = 'chairman';
            profileData.hasCustomAdminAccess = true;
            
            // تحديث في الخلفية
            updateDoc(uidRef, { 
              isActive: true, 
              primaryRole: 'chairman', 
              hasCustomAdminAccess: true 
            }).catch(() => {});
          }
          
          // ✅ إصلاح المشكلة: تأكد من أن isActive له قيمة افتراضية true للمستخدمين العاديين
          if (profileData && profileData.isActive === undefined) {
            profileData.isActive = true;
          }
          
          setUserProfile(profileData);
          setCurrentUser(user); 

        } catch (error) {
          console.error("خطأ في جلب بيانات المستخدم:", error);
          // السماح بالدخول المؤقت حتى لو فشل جلب البيانات
          setCurrentUser(user);
          setUserProfile({
            uid: user.uid,
            email: user.email || '',
            name: user.email?.split('@')[0] || 'مستخدم',
            phone: '',
            department: 'الإدارة العليا',
            primaryRole: 'employee',
            additionalTitles: [],
            isActive: true // ✅ مؤقتاً نعتبره نشط
          });
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ✅ isPending: false للمدير أو إذا كان isActive = true
  const isPending = userProfile ? !userProfile.isActive : false;

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, isPending }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);