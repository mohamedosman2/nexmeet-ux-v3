// ==========================================
// ملف إدارة حالة المصادقة والصلاحيات (Auth Context)
// ==========================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { UserProfile, Role } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isPending: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// القائمة البيضاء للقيادات العليا (تمنحهم صلاحيات وتخطي للمراجعة تلقائياً)
const predefinedUsers: Record<string, { name: string; department: string; primaryRole: Role; additionalTitles: string[]; phone: string }> = {
  "mohd@uexperts.sa": {
    name: "محمد آل نصار (أبو نواف)",
    department: "الإدارة العليا",
    primaryRole: "chairman", // رئيس مجلس الإدارة (كل الصلاحيات)
    additionalTitles: ["رئيس مجلس الإدارة"],
    phone: "+966568652222"
  },
  "ali@uexperts.sa": {
    name: "علي آل رابعة القحطاني",
    department: "التسويق",
    primaryRole: "vp", // نائب رئيس (كل الصلاحيات)
    additionalTitles: ["نائب رئيس مجلس الإدارة", "مدير التسويق"],
    phone: "+966556333301"
  },
  "m.othman@uexperts.sa": {
    name: "محمد عثمان",
    department: "المالية والتدقيق",
    primaryRole: "vp", // مبرمج كنائب رئيس (VP) لفتح لوحة التحكم ومنحك كل الصلاحيات
    additionalTitles: ["مستشار رئيس مجلس الإدارة"],
    phone: "+966539303952"
  },
  "muharib@uexperts.sa": {
    name: "خالد المحارب",
    department: "العلاقات العامة",
    primaryRole: "manager", // مدير ليمتلك صلاحيات إدارته
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
          
          // 1. البحث عن البروفايل باستخدام الـ UID
          const uidRef = doc(db, "users", user.uid);
          const uidSnap = await getDoc(uidRef);
          
          if (uidSnap.exists()) {
            profileData = uidSnap.data() as UserProfile;
          }

          // 2. البحث عن البروفايل باستخدام الإيميل (التوافق الرجعي)
          if (!profileData && user.email) {
            const emailRef = doc(db, "users", user.email.toLowerCase());
            const emailSnap = await getDoc(emailRef);
            if (emailSnap.exists()) {
              profileData = emailSnap.data() as UserProfile;
            }
          }

          // 3. البناء التلقائي للقيادات (Auto-Seeding)
          if (!profileData) {
            let matchedEmail = user.email?.toLowerCase();
            
            // إذا سجل الدخول بالهاتف، نبحث عن حسابه في القائمة البيضاء
            if (!matchedEmail && user.phoneNumber) {
              matchedEmail = Object.keys(predefinedUsers).find(
                e => predefinedUsers[e].phone === user.phoneNumber
              );
            }

            // إذا كان من القيادات، ابنِ حسابه وفعله فوراً (isActive: true)
            if (matchedEmail && predefinedUsers[matchedEmail]) {
              const defaultData = predefinedUsers[matchedEmail];
              const newProfile: UserProfile = {
                uid: user.uid,
                email: matchedEmail,
                isActive: true, // تخطي المراجعة للقيادات
                name: defaultData.name,
                department: defaultData.department,
                primaryRole: defaultData.primaryRole,
                additionalTitles: defaultData.additionalTitles,
                phone: defaultData.phone
              };
              // حفظ النسخة في قاعدة البيانات
              await setDoc(doc(db, "users", user.uid), newProfile);
              if (matchedEmail !== user.uid) {
                await setDoc(doc(db, "users", matchedEmail), newProfile);
              }
              profileData = newProfile;
            }
          }

          setUserProfile(profileData);
        } catch (error) {
          // التعامل الصامت مع الأخطاء لعدم إيقاف النظام
          setUserProfile(null);
        }
      } else {
        // حالة تسجيل الخروج
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // الموظف الجديد يكون Pending إذا كان بروفايله موجوداً لكن isActive = false
  const isPending = userProfile ? !userProfile.isActive : false;

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, isPending }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);