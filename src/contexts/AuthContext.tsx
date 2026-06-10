import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { type UserProfile, type Role } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isPending: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// الحسابات القيادية الثابتة مع تنفيذ تعليماتك حرفياً
const predefinedUsers: Record<string, { name: string; department: string; primaryRole: Role; additionalTitles: string[]; phone: string }> = {
  "mohd@uexperts.sa": {
    name: "محمد آل نصار (أبو نواف)",
    department: "الإدارة العليا",
    primaryRole: "chairman", // رئيس مجلس الإدارة
    additionalTitles: ["رئيس مجلس الإدارة"],
    phone: "+966568652222"
  },
  "ali@uexperts.sa": {
    name: "علي آل رابعة القحطاني",
    department: "التسويق",
    primaryRole: "vp", // نائب رئيس وله كل الصلاحيات
    additionalTitles: ["نائب رئيس مجلس الإدارة", "مدير التسويق"],
    phone: "+966556333301"
  },
  "m.othman@uexperts.sa": {
    name: "محمد عثمان",
    department: "المالية والتدقيق",
    primaryRole: "vp", // منحك صلاحية الإدارة العليا لتعمل معك لوحة التحكم بالكامل
    additionalTitles: ["مستشار رئيس مجلس الإدارة"],
    phone: "+966539303952"
  },
  "muharib@uexperts.sa": {
    name: "خالد المحارب",
    department: "العلاقات العامة",
    primaryRole: "manager", // مدير إدارة مع لقب إضافي
    additionalTitles: ["مستشار رئيس مجلس الإدارة"],
    phone: "+966542222207"
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          let profileData: UserProfile | null = null;
          const uidRef = doc(db, "users", user.uid);
          const uidSnap = await getDoc(uidRef);
          
          if (uidSnap.exists()) {
            profileData = uidSnap.data() as UserProfile;
          }

          if (!profileData && user.email) {
            const emailRef = doc(db, "users", user.email.toLowerCase());
            const emailSnap = await getDoc(emailRef);
            if (emailSnap.exists()) profileData = emailSnap.data() as UserProfile;
          }

          if (!profileData) {
            let matchedEmail = user.email?.toLowerCase();
            if (!matchedEmail && user.phoneNumber) {
              matchedEmail = Object.keys(predefinedUsers).find(e => predefinedUsers[e].phone === user.phoneNumber);
            }
            if (matchedEmail && predefinedUsers[matchedEmail]) {
              const defaultData = predefinedUsers[matchedEmail];
              const newProfile: UserProfile = {
                uid: user.uid, email: matchedEmail, isActive: true,
                name: defaultData.name, department: defaultData.department,
                primaryRole: defaultData.primaryRole, additionalTitles: defaultData.additionalTitles, phone: defaultData.phone
              };
              await setDoc(doc(db, "users", user.uid), newProfile);
              await setDoc(doc(db, "users", matchedEmail), newProfile);
              profileData = newProfile;
            }
          }
          setUserProfile(profileData);
        } catch (error) {
          console.error("خطأ:", error);
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