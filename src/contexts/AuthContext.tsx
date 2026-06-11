// ==========================================
// الجدار الناري والمصادقة (Auth Context)
// تم إصلاح مشكلة حلقة التوجيه اللانهائية (التحديث المتزامن)
// ==========================================
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
            // إنشاء ملف شخصي طوارئ لتجنب انهيار النظام إذا فشل الجلب
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
            await setDoc(uidRef, profileData);
          }

          // ترقية إجبارية وتفعيل لحسابك الأساسي لضمان عدم طردك أبداً
          if (user.email?.toLowerCase() === 'm.othman@uexperts.sa') {
            if (!profileData.isActive || profileData.primaryRole !== 'chairman') {
              await updateDoc(uidRef, { 
                isActive: true, 
                primaryRole: 'chairman', 
                hasCustomAdminAccess: true 
              });
              profileData.isActive = true;
              profileData.primaryRole = 'chairman';
              profileData.hasCustomAdminAccess = true;
            }
          }
          
          // تحديث الحالات بالتوازي لمنع ثغرات التوجيه الزمنية
          setUserProfile(profileData);
          setCurrentUser(user); 

        } catch (error) {
          console.error("AuthContext Critical Error:", error);
          setUserProfile(null);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const isPending = userProfile ? !userProfile.isActive : false;

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, isPending }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);