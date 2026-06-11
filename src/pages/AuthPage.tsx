// ==========================================
// صفحة تسجيل الدخول (Auth Page)
// تم تطبيق التوجيه الإجباري + حل مشكلة عدم الانتقال بعد التحقق
// ==========================================
import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const DEPARTMENTS = [
  'التسويق', 'المالية والتدقيق', 'الموارد البشرية', 'التكنولوجيا', 'العلاقات العامة', 'الإدارة العليا'
];

export const AuthPage: React.FC = () => {
  const { currentUser, isPending } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [is2FAWaiting, setIs2FAWaiting] = useState(false);
  const [view, setView] = useState<'login' | 'register'>('login');

  // =========================================================
  // 0. التوجيه التلقائي بعد تسجيل الدخول (🔥 الحل الأساسي)
  // =========================================================
  useEffect(() => {
    if (currentUser && !isPending) {
      window.location.href = '/';
    }
  }, [currentUser, isPending]);

  // =========================================================
  // 1. معالجة الرابط السحري عند العودة من البريد
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
          setSuccessMsg('تم التحقق بنجاح! جاري نقلك للنظام...');
          
          // fallback redirect
          setTimeout(() => {
            window.location.href = '/'; 
          }, 1500);

        } catch (err: any) {
          console.error(err);
          setErrorMsg('الرابط منتهي الصلاحية أو تم استخدامه مسبقاً. يرجى تسجيل الدخول مجدداً.');
        } finally {
          setLoading(false);
        }
      }
    };
    handleEmailLink();
  }, []);

  // =========================================================
  // 2. تسجيل الدخول
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
          setErrorMsg('حسابك لا يزال قيد المراجعة.');
          await signOut(auth);
          setLoading(false);
          return;
        }
      }

      const actionCodeSettings = {
        url: window.location.origin + '/', // 🔥 تم التعديل هنا
        handleCodeInApp: true,
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      
      await signOut(auth); 
      
      setIs2FAWaiting(true);
      setSuccessMsg('تم إرسال رابط الدخول إلى بريدك.');

    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setErrorMsg('البريد غير مسجل.');
      else if (err.code === 'auth/wrong-password') setErrorMsg('كلمة المرور غير صحيحة.');
      else setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // 3. إنشاء حساب
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
        name,
        phone,
        department,
        primaryRole: 'employee',
        additionalTitles: [],
        isActive: false 
      });
      
      await signOut(auth); 
      
      setSuccessMsg('تم إنشاء الحساب. انتظر التفعيل.');
      setView('login');
      setPassword('');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setErrorMsg('البريد مستخدم.');
      else if (err.code === 'auth/weak-password') setErrorMsg('كلمة المرور ضعيفة.');
      else setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // واجهة قيد المراجعة
  // =========================================================
  if (currentUser && isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2>حسابك قيد المراجعة</h2>
          <button onClick={() => { auth.signOut(); window.location.href = '/login'; }}>
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // الواجهة الرئيسية
  // =========================================================
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">

        {errorMsg && <div>{errorMsg}</div>}
        {successMsg && <div>{successMsg}</div>}

        {is2FAWaiting ? (
          <div>تحقق من بريدك الإلكتروني</div>
        ) : (
          <form onSubmit={view === 'login' ? handleLogin : handleRegister}>
            
            {view === 'register' && (
              <>
                <input value={name} onChange={(e) => setName(e.target.value)} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </>
            )}

            <input value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <button type="submit">
              {view === 'login' ? 'دخول' : 'تسجيل'}
            </button>

            <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')}>
              تغيير
            </button>

          </form>
        )}
      </div>
    </div>
  );
};