// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot
} from 'firebase/firestore';
import { auth, db, sendMagicLink, signInWithMagicLink, loginWithEmail } from '../config/firebase';
import type { UserProfile, UserSettings, Notification } from '../types';
import toast from 'react-hot-toast';

// ==========================================
// واجهة سياق المصادقة
// ==========================================

interface AuthContextType {
  // بيانات المستخدم الأساسية
  currentUser: User | null;
  userProfile: UserProfile | null;
  userSettings: UserSettings | null;
  
  // حالات التحميل والتحقق
  loading: boolean;
  isPending: boolean;
  isEmailVerified: boolean;
  
  // عدد الإشعارات غير المقروءة
  unreadNotificationsCount: number;
  
  // دوال المصادقة
  login: (email: string, password: string) => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  handleMagicLinkSignIn: () => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  
  // دوال تحديث الملف الشخصي
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  
  // دوال الصلاحيات
  canAccessAdminPanel: boolean;
  canManageDepartment: (departmentName: string) => boolean;
  isTopManagement: boolean;
  isChairman: boolean;
  isVP: boolean;
  isManager: boolean;
  isEmployee: boolean;
}

// ==========================================
// القيم الافتراضية للسياق
// ==========================================

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// ==========================================
// مزود المصادقة
// ==========================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // الحالات الأساسية
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // ==========================================
  // تحديث بيانات المستخدم من Firestore
  // ==========================================

  const refreshUserProfile = useCallback(async () => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }

    try {
      // جلب بيانات المستخدم من Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        setUserProfile(profileData);
        
        // تحديث حالة التحقق من البريد الإلكتروني
        setIsEmailVerified(currentUser.emailVerified);
        
        // جلب إعدادات المستخدم
        const settingsDoc = await getDoc(doc(db, 'userSettings', currentUser.uid));
        if (settingsDoc.exists()) {
          setUserSettings(settingsDoc.data() as UserSettings);
        } else {
          // إنشاء إعدادات افتراضية للمستخدم الجديد
          const defaultSettings: UserSettings = {
            uid: currentUser.uid,
            theme: 'dark',
            language: 'ar',
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true,
            taskReminderMinutes: 30,
            meetingReminderMinutes: 15,
            workingHoursStart: '09:00',
            workingHoursEnd: '17:00',
            weekendDays: [5, 6] // الجمعة والسبت
          };
          await setDoc(doc(db, 'userSettings', currentUser.uid), defaultSettings);
          setUserSettings(defaultSettings);
        }
      } else {
        console.warn('⚠️ لم يتم العثور على ملف تعريف المستخدم');
      }
    } catch (error) {
      console.error('❌ خطأ في جلب بيانات المستخدم:', error);
      toast.error('حدث خطأ في تحميل بيانات المستخدم');
    }
  }, [currentUser]);

  // ==========================================
  // الاشتراك في الإشعارات غير المقروءة في الوقت الفعلي
  // ==========================================

  useEffect(() => {
    if (!currentUser?.uid) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('targetUid', '==', currentUser.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadNotificationsCount(snapshot.size);
    }, (error) => {
      console.error('خطأ في الاستماع للإشعارات:', error);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // ==========================================
  // مراقبة حالة المصادقة من Firebase
  // ==========================================

  useEffect(() => {
    console.log('🚀 بدء تشغيل AuthProvider');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('📡 onAuthStateChanged - المستخدم:', user?.email || 'لا يوجد مستخدم');
      
      setCurrentUser(user);
      
      if (user) {
        await refreshUserProfile();
      } else {
        setUserProfile(null);
        setUserSettings(null);
        setIsEmailVerified(false);
        setUnreadNotificationsCount(0);
      }
      
      setLoading(false);
    });
    
    return () => {
      console.log('🔚 إلغاء مراقبة AuthProvider');
      unsubscribe();
    };
  }, [refreshUserProfile]);

  // ==========================================
  // معالجة رابط السحري (Magic Link) عند فتح التطبيق
  // ==========================================

  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        const result = await signInWithMagicLink();
        if (result) {
          console.log('✅ تم تسجيل الدخول بنجاح عبر الرابط السحري');
          toast.success('تم تسجيل الدخول بنجاح!');
          // إعادة التوجيه إلى الصفحة الرئيسية
          window.location.href = '/dashboard';
        }
      } catch (error) {
        console.error('❌ خطأ في معالجة الرابط السحري:', error);
        toast.error('فشل تسجيل الدخول عبر الرابط السحري');
      }
    };
    
    handleMagicLink();
  }, []);

  // ==========================================
  // دوال المصادقة الأساسية
  // ==========================================

  /**
   * تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
   */
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCred = await loginWithEmail(email, password);
      console.log('✅ تم تسجيل الدخول بنجاح:', userCred.user.email);
      toast.success('تم تسجيل الدخول بنجاح!');
      await refreshUserProfile();
    } catch (error: any) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      
      // معالجة أخطاء Firebase المختلفة
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error('البريد الإلكتروني غير مسجل في النظام');
          break;
        case 'auth/wrong-password':
          toast.error('كلمة المرور غير صحيحة');
          break;
        case 'auth/too-many-requests':
          toast.error('تم حظر تسجيل الدخول مؤقتاً. يرجى المحاولة لاحقاً');
          break;
        case 'auth/invalid-email':
          toast.error('البريد الإلكتروني غير صحيح');
          break;
        default:
          toast.error(`خطأ في تسجيل الدخول: ${error.message}`);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [refreshUserProfile]);

  /**
   * إرسال رابط سحري لتسجيل الدخول
   */
  const loginWithMagicLink = useCallback(async (email: string) => {
    setLoading(true);
    try {
      await sendMagicLink(email);
      toast.success('تم إرسال رابط تسجيل الدخول إلى بريدك الإلكتروني');
    } catch (error: any) {
      console.error('❌ خطأ في إرسال الرابط السحري:', error);
      
      switch (error.code) {
        case 'auth/invalid-email':
          toast.error('البريد الإلكتروني غير صحيح');
          break;
        case 'auth/user-not-found':
          toast.error('البريد الإلكتروني غير مسجل في النظام');
          break;
        default:
          toast.error(`خطأ في إرسال الرابط: ${error.message}`);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * تسجيل الخروج من النظام
   */
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setUserSettings(null);
      toast.success('تم تسجيل الخروج بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تسجيل الخروج:', error);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * إرسال رابط إعادة تعيين كلمة المرور
   */
  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك');
    } catch (error: any) {
      console.error('❌ خطأ في إرسال رابط إعادة التعيين:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error('البريد الإلكتروني غير مسجل في النظام');
          break;
        case 'auth/invalid-email':
          toast.error('البريد الإلكتروني غير صحيح');
          break;
        default:
          toast.error(`خطأ في إرسال الرابط: ${error.message}`);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * إرسال رابط تأكيد البريد الإلكتروني
   */
  const sendVerificationEmail = useCallback(async () => {
    if (!currentUser) {
      toast.error('لا يوجد مستخدم مسجل الدخول');
      return;
    }
    
    setLoading(true);
    try {
      await sendEmailVerification(currentUser);
      toast.success('تم إرسال رابط تأكيد البريد الإلكتروني');
    } catch (error) {
      console.error('❌ خطأ في إرسال رابط التأكيد:', error);
      toast.error('حدث خطأ أثناء إرسال رابط التأكيد');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // ==========================================
  // دوال تحديث الملف الشخصي والإعدادات
  // ==========================================

  /**
   * تحديث بيانات الملف الشخصي
   */
  const updateUserProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!currentUser) {
      toast.error('لا يوجد مستخدم مسجل الدخول');
      return;
    }
    
    setLoading(true);
    try {
      // تحديث في Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: Date.now()
      });
      
      // تحديث الاسم في Firebase Authentication إذا تم تغييره
      if (data.name && currentUser.displayName !== data.name) {
        await updateProfile(currentUser, { displayName: data.name });
      }
      
      // تحديث الحالة المحلية
      await refreshUserProfile();
      toast.success('تم تحديث الملف الشخصي بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تحديث الملف الشخصي:', error);
      toast.error('حدث خطأ أثناء تحديث الملف الشخصي');
    } finally {
      setLoading(false);
    }
  }, [currentUser, refreshUserProfile]);

  /**
   * تحديث إعدادات المستخدم
   */
  const updateUserSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!currentUser) {
      toast.error('لا يوجد مستخدم مسجل الدخول');
      return;
    }
    
    try {
      const settingsRef = doc(db, 'userSettings', currentUser.uid);
      await updateDoc(settingsRef, {
        ...settings,
        updatedAt: Date.now()
      });
      
      setUserSettings(prev => prev ? { ...prev, ...settings } : null);
      toast.success('تم تحديث الإعدادات بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تحديث الإعدادات:', error);
      toast.error('حدث خطأ أثناء تحديث الإعدادات');
    }
  }, [currentUser]);

  // ==========================================
  // دوال الصلاحيات المحسوبة
  // ==========================================

  /**
   * هل المستخدم من الإدارة العليا (رئيس أو نائب)
   */
  const isTopManagement = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.primaryRole === 'chairman' || userProfile.primaryRole === 'vp';
  }, [userProfile]);

  /**
   * هل المستخدم رئيس مجلس الإدارة
   */
  const isChairman = useMemo(() => {
    return userProfile?.primaryRole === 'chairman';
  }, [userProfile]);

  /**
   * هل المستخدم نائب رئيس
   */
  const isVP = useMemo(() => {
    return userProfile?.primaryRole === 'vp';
  }, [userProfile]);

  /**
   * هل المستخدم مدير إدارة
   */
  const isManager = useMemo(() => {
    return userProfile?.primaryRole === 'manager';
  }, [userProfile]);

  /**
   * هل المستخدم موظف عادي
   */
  const isEmployee = useMemo(() => {
    return userProfile?.primaryRole === 'employee';
  }, [userProfile]);

  /**
   * هل يمكن للمستخدم الوصول إلى لوحة التحكم
   */
  const canAccessAdminPanel = useMemo(() => {
    if (!userProfile) return false;
    if (isTopManagement) return true;
    if (isManager) return true;
    if (userProfile.hasCustomAdminAccess === true) return true;
    return false;
  }, [userProfile, isTopManagement, isManager]);

  /**
   * هل يمكن للمستخدم إدارة إدارة معينة
   */
  const canManageDepartment = useCallback((departmentName: string) => {
    if (!userProfile) return false;
    if (isTopManagement) return true;
    if (isManager && userProfile.department === departmentName) return true;
    if (userProfile.accessibleDepartments?.includes(departmentName)) return true;
    return false;
  }, [userProfile, isTopManagement, isManager]);

  /**
   * هل الحساب قيد المراجعة
   */
  const isPending = useMemo(() => {
    return userProfile ? userProfile.isActive === false : false;
  }, [userProfile]);

  // ==========================================
  // قيم السياق المصدرة
  // ==========================================

  const contextValue: AuthContextType = {
    currentUser,
    userProfile,
    userSettings,
    loading,
    isPending,
    isEmailVerified,
    unreadNotificationsCount,
    login,
    loginWithMagicLink,
    handleMagicLinkSignIn: async () => {
      const result = await signInWithMagicLink();
      return result !== null;
    },
    logout,
    resetPassword,
    sendVerificationEmail,
    updateUserProfile,
    updateUserSettings,
    refreshUserProfile,
    canAccessAdminPanel,
    canManageDepartment,
    isTopManagement,
    isChairman,
    isVP,
    isManager,
    isEmployee
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ==========================================
// Hook مخصص لاستخدام سياق المصادقة
// ==========================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ==========================================
// Hook إضافي للحصول على بيانات المستخدم فقط
// ==========================================

export const useUser = () => {
  const { currentUser, userProfile, loading } = useAuth();
  return { currentUser, userProfile, loading };
};

// ==========================================
// Hook للحصول على الصلاحيات فقط
// ==========================================

export const usePermissions = () => {
  const {
    canAccessAdminPanel,
    canManageDepartment,
    isTopManagement,
    isChairman,
    isVP,
    isManager,
    isEmployee
  } = useAuth();
  
  return {
    canAccessAdminPanel,
    canManageDepartment,
    isTopManagement,
    isChairman,
    isVP,
    isManager,
    isEmployee
  };
};