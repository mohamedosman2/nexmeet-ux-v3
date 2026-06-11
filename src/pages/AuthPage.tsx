// ==========================================
// صفحة تسجيل الدخول (Auth Page)
// ==========================================
import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  // sendSignInLinkToEmail, // ⚠️ تم التعليق مؤقتاً لمنع خطأ Netlify أثناء البناء
  isSignInWithEmailLink, 
  signInWithEmailLink,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DEPARTMENTS = [
  'التسويق', 'المالية والتدقيق', 'الموارد البشرية', 'التكنولوجيا', 'العلاقات العامة', 'الإدارة العليا'
];

type AuthView = 'login' | 'register' | 'forgot';

export const AuthPage: React.FC = () => {
  const { currentUser, isPending } = useAuth();
  const navigate = useNavigate();
  
  // حالات البيانات
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);

  // حالات الواجهة والنظام
  const [view, setView] = useState<AuthView>('login');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [is2FAWaiting, setIs2FAWaiting] = useState(false);

  // =========================================================
  // 1. التوجيه التلقائي الجذري
  // =========================================================
  useEffect(() => {
    if (currentUser && !isPending) {
      navigate('/dashboard');
    }
  }, [currentUser, isPending, navigate]);

  // =========================================================
  // 2. معالجة رابط التأكيد للمصادقة الثنائية 
  // =========================================================
  useEffect(() => {
    const handleEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setLoading(true);
        let savedEmail = window.localStorage.getItem('emailForSignIn');
        
        if (!savedEmail) {
          savedEmail = window.prompt('يرجى تأكيد بريدك الإلكتروني لإكمال الدخول بأمان:');
        }
        
        try {
          await signInWithEmailLink(auth, savedEmail || '', window.location.href);
          window.localStorage.removeItem('emailForSignIn');
          setSuccessMsg('تم التحقق بنجاح! يتم الآن مزامنة بياناتك ونقلك للنظام...');
          
          window.history.replaceState(null, '', '/login');
          
          setTimeout(() => {
            window.location.replace('/dashboard'); 
          }, 1000);

        } catch (err: any) {
          if (auth.currentUser) {
            window.location.replace('/dashboard');
          } else {
            console.error(err);
            setErrorMsg('الرابط منتهي الصلاحية أو تم استخدامه مسبقاً. يرجى إعادة المحاولة.');
          }
        } finally {
          setLoading(false);
        }
      }
    };
    handleEmailLink();
  }, []);

  // =========================================================
  // 3. الدخول الأساسي 
  // =========================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (!userData.isActive && userData.email !== 'm.othman@uexperts.sa') {
          setErrorMsg('بيانات الدخول صحيحة، ولكن حسابك قيد المراجعة الإدارية. يرجى الانتظار.');
          await signOut(auth);
          setLoading(false);
          return;
        }
      }

      // ✅ الدخول المباشر (تم استخدام window.location لحل مشكلة التعليق من جذورها)
      setSuccessMsg('تم تسجيل الدخول بنجاح! جاري التوجيه...');
      setTimeout(() => {
        window.location.replace('/dashboard'); 
      }, 500);
      
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setErrorMsg('بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.');
      else if (err.code === 'auth/wrong-password') setErrorMsg('بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.');
      else if (err.code === 'auth/invalid-credential') setErrorMsg('بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.');
      else setErrorMsg(`حدث خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // 4. استعادة كلمة المرور
  // =========================================================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('تم إرسال رابط استعادة كلمة المرور لبريدك.');
    } catch (err: any) {
      setErrorMsg(`حدث خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // 5. إنشاء حساب موظف جديد
  // =========================================================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email.toLowerCase(),
        name: name,
        phone: phone,
        department: department,
        primaryRole: 'employee',
        additionalTitles: [],
        isActive: false 
      });
      
      await signOut(auth); 
      
      setSuccessMsg('تم إنشاء الحساب بنجاح! يرجى انتظار تفعيل الإدارة لحسابك.');
      setView('login');
      setPassword('');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setErrorMsg('هذا البريد مسجل مسبقاً.');
      else if (err.code === 'auth/weak-password') setErrorMsg('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل).');
      else setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // شاشة حساب قيد المراجعة
  // =========================================================
  if (currentUser && isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a0a', fontFamily: 'Cairo, sans-serif' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(139,26,26,.15), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(30,58,110,.1), transparent 50%)' }}></div>
        <div className="w-full max-w-md p-8 rounded-2xl border border-yellow-900/50 bg-[#111] relative z-10 shadow-2xl text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/50">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">حسابك قيد المراجعة</h2>
          <p className="text-gray-400 text-sm mb-6">مرحباً بك في شركة UX. يرجى انتظار تفعيل حسابك من قبل مدير إدارتك للبدء في استخدام النظام.</p>
          <button onClick={() => { auth.signOut(); navigate('/login'); }} className="text-sm text-red-500 font-bold border border-red-500/30 px-6 py-2 rounded-lg hover:bg-red-500/10">
            تسجيل الخروج والعودة
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // الواجهة الرئيسية الديناميكية
  // =========================================================
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a0a', fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(139,26,26,.15), transparent 6