import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const DEPARTMENTS = [
  'التسويق', 'المالية والتدقيق', 'الموارد البشرية', 'التكنولوجيا', 'العلاقات العامة', 'الإدارة العليا'
];

type AuthView = 'login' | 'register' | 'forgot';

export const AuthPage: React.FC = () => {
  const { currentUser, isPending } = useAuth();
  
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

  // =========================================================
  // 1. التوجيه التلقائي - أي مستخدم يسجل دخول يذهب للرئيسية
  // =========================================================
  useEffect(() => {
    if (currentUser && !isPending) {
      console.log('✅ تم اكتشاف مستخدم مسجل الدخول، جاري التوجيه إلى الرئيسية');
      window.location.href = '/';
    }
  }, [currentUser, isPending]);

  // =========================================================
  // 2. معالجة رابط التأكيد (إذا كنت تستخدم المصادقة عبر البريد)
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
          setSuccessMsg('تم التحقق بنجاح! جاري التوجيه...');
          window.history.replaceState(null, '', '/login');
          
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);

        } catch (err: any) {
          console.error(err);
          setErrorMsg('الرابط منتهي الصلاحية أو تم استخدامه مسبقاً. يرجى إعادة المحاولة.');
        } finally {
          setLoading(false);
        }
      }
    };
    handleEmailLink();
  }, []);

  // =========================================================
  // 3. الدخول الأساسي - بدون أي شروط أو تحقق من isActive
  // =========================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // فقط قم بتسجيل الدخول إلى Firebase Authentication
      await signInWithEmailAndPassword(auth, email, password);
      
      // إذا وصلنا إلى هنا، تسجيل الدخول نجح 100%
      setSuccessMsg('تم تسجيل الدخول بنجاح! جاري التوجيه...');
      
      // لا نقوم بأي توجيه مباشر، useEffect سيتولى المهمة
      // ولكن نضع مؤقت احتياطي لمدة 1 ثانية
      setTimeout(() => {
        if (auth.currentUser) {
          window.location.href = '/';
        }
      }, 1000);
      
    } catch (err: any) {
      console.error('خطأ في تسجيل الدخول:', err.code);
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('تم حظر الدخول مؤقتاً بسبب كثرة المحاولات. يرجى المحاولة لاحقاً.');
      } else {
        setErrorMsg(`حدث خطأ: ${err.message}`);
      }
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
        isActive: true // تم التعديل: أي حساب جديد يكون نشطاً فوراً
      });
      
      setSuccessMsg('تم إنشاء الحساب بنجاح! جاري التوجيه...');
      
      // بعد إنشاء الحساب، سيكون المستخدم مسجل الدخول تلقائياً
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setErrorMsg('هذا البريد مسجل مسبقاً.');
      else if (err.code === 'auth/weak-password') setErrorMsg('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل).');
      else setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // الواجهة الرئيسية
  // =========================================================
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a0a', fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(139,26,26,.15), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(30,58,110,.1), transparent 50%)' }}></div>
      <div className="absolute rounded-full opacity-10 bg-[#8B1A1A] w-64 h-64 top-[10%] left-[20%] blur-[100px]"></div>
      <div className="absolute rounded-full opacity-10 bg-[#1E3A6E] w-80 h-80 top-[40%] right-[15%] blur-[120px]"></div>

      <div className="w-full max-w-md p-8 rounded-2xl border border-[#1f1f1f] bg-[#111] relative z-10 shadow-2xl">
        
        {/* الهيدر المشترك */}
        <div className="text-center mb-8">
          <svg viewBox="0 0 340 70" className="w-48 mx-auto mb-4">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
          <h1 className="text-xl font-bold text-white mb-1">شركة UX - خبراء المتحدة</h1>
          <p className="text-[#888] text-sm">نظام إدارة المهام والتقويم</p>
        </div>

        {errorMsg && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center mb-5 font-bold">
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="bg-green-900/30 border border-green-500/50 text-green-400 p-3 rounded-lg text-sm text-center mb-5 font-bold">
            {successMsg}
          </div>
        )}

        {/* واجهة الدخول */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-right text-sm text-[#888] mb-1">البريد الإلكتروني</label>
              <input 
                type="email" 
                dir="ltr" 
                required 
                className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A]" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-right text-sm text-[#888] mb-1">كلمة المرور</label>
              <input 
                type="password" 
                dir="ltr" 
                required 
                className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A]" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full mt-2 bg-[#A52A2A] text-white font-bold py-3 rounded-lg hover:bg-[#8B1A1A] transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري المعالجة...' : 'تسجيل الدخول'}
            </button>
            <div className="flex justify-between items-center mt-2 px-1">
              <button 
                type="button" 
                onClick={() => setView('register')} 
                className="text-[#1E3A6E] text-sm font-bold hover:underline"
              >
                إنشاء حساب جديد
              </button>
              <button 
                type="button" 
                onClick={() => setView('forgot')} 
                className="text-[#8B1A1A] text-sm font-bold hover:underline"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          </form>
        )}

        {/* واجهة إنشاء حساب */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div className="text-center mb-2">
              <h3 className="text-white font-bold mb-1">تسجيل موظف جديد</h3>
            </div>
            <input 
              type="text" 
              placeholder="الاسم الكامل" 
              required 
              className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A]" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
            <input 
              type="text" 
              dir="ltr" 
              placeholder="رقم الجوال" 
              required 
              className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A]" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
            />
            <select 
              required 
              className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A]" 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
            <input 
              type="email" 
              dir="ltr" 
              placeholder="البريد الإلكتروني" 
              required 
              className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A]" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              type="password" 
              dir="ltr" 
              placeholder="كلمة المرور (6 أحرف على الأقل)" 
              required 
              className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A]" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full mt-2 bg-[#1E3A6E] text-white font-bold py-3 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </button>
            <button 
              type="button" 
              onClick={() => setView('login')} 
              className="w-full text-gray-400 text-sm hover:text-white font-bold mt-2"
            >
              لدي حساب بالفعل
            </button>
          </form>
        )}

        {/* واجهة استعادة كلمة المرور */}
        {view === 'forgot' && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <h3 className="text-white font-bold mb-1">استعادة كلمة المرور</h3>
              <p className="text-xs text-gray-500">أدخل بريدك المسجل لإرسال رابط إعادة التعيين.</p>
            </div>
            <input 
              type="email" 
              dir="ltr" 
              required 
              placeholder="البريد الإلكتروني" 
              className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A]" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full mt-2 bg-yellow-600 text-white font-bold py-3 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
            </button>
            <button 
              type="button" 
              onClick={() => setView('login')} 
              className="w-full text-gray-400 text-sm hover:text-white font-bold mt-2"
            >
              العودة لتسجيل الدخول
            </button>
          </form>
        )}
      </div>
    </div>
  );
};