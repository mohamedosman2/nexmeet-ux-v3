import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { type UserProfile } from '../types';

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
        setCurrentUser(user);
        try {
          let profileData = null;

          // 1. محاولة جلب البيانات بالإيميل (للدخول بالبريد)
          if (user.email) {
            const docRef = doc(db, "users", user.email);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              profileData = docSnap.data() as UserProfile;
            }
          }

          // 2. إذا لم يجد الإيميل، يبحث برقم الجوال (للدخول بالهاتف)
          if (!profileData && user.phoneNumber) {
            const q = query(collection(db, "users"), where("phone", "==", user.phoneNumber));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              profileData = querySnapshot.docs[0].data() as UserProfile;
            }
          }

          setUserProfile(profileData);
        } catch (error) {
          console.error("خطأ في جلب بيانات المستخدم:", error);
          setUserProfile(null);
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