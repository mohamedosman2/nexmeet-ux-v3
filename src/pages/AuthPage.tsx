// ==========================================
// صفحة تسجيل الدخول (Auth Page)
// تم تطبيق نظام المصادقة الثنائية (كلمة المرور + رابط التحقق الإجباري)
// ==========================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [is2FAWaiting, setIs2FAWaiting] = useState(false); // حالة انتظار التحقق من الرابط
  const [view, setView] = useState<'login' | 'register'>('login'); // للتبديل بين الدخول والتسجيل

  // 1. معالجة الرابط السحري عند ضغط الموظف عليه من بريده
  useEffect(() => {
    const handleEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        setLoading(true);
        let savedEmail = window.localStorage.getItem('emailForSignIn');
        if (!savedEmail) {
          savedEmail = window.prompt('يرجى تأكيد بريدك الإلكتروني لإكمال الدخول:');
        }
        
        try {
          await signInWithEmailLink(auth, savedEmail || '', window.location.href);
          window.localStorage.removeItem('emailForSignIn');
          setSuccessMsg('تم التحقق بنجاح! جاري توجيهك للنظام...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err: any) {
          console.error(err);
          setErrorMsg('الرابط منتهي الصلاحية أو غير صالح. يرجى تسجيل الدخول مجدداً.');
        } finally {
          setLoading(false);
        }
      }
    };
    handleEmailLink();
  }, [navigate]);

  // 2. دالة تسجيل الدخول (كلمة المرور + إرسال الرابط)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // الخطوة الأولى: التحقق من صحة الإيميل والباسورد
      await signInWithEmailAndPassword(auth, email, password);
      
      // الخطوة الثانية: الباسورد صحيح! الآن نرسل رابط التأكيد كخطوة أمنية ثانية
      const actionCodeSettings = {
        url: window.location.origin + '/login', // العودة لنفس الصفحة للتحقق
        handleCodeInApp: true,
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      
      // تسجيل الخروج فوراً حتى لا يدخل النظام قبل الضغط على الرابط
      await signOut(auth); 
      
      setIs2FAWaiting(true);
      setSuccessMsg('كلمة المرور صحيحة. تم إرسال رابط الدخول النهائي إلى بريدك، يرجى تفقد صندوق الوارد.');
      
    } catch (err: any) {
      console.error(err.code);
      // ترجمة الأخطاء لتعرف المشكلة بالضبط
      if (err.code === 'auth/user-not-found') setErrorMsg('هذا البريد غير مسجل في النظام.');
      else if (err.code === 'auth/wrong-password') setErrorMsg('كلمة المرور غير صحيحة.');
      else if (err.code === 'auth/invalid-credential') setErrorMsg('بيانات الدخول (البريد أو كلمة المرور) غير صحيحة.');
      else setErrorMsg(`حدث خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // دالة إنشاء حساب جديد (للموظفين الجدد)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email.toLowerCase(),
        name: email.split('@')[0],
        department: 'قيد التحديد',
        primaryRole: 'employee',
        isActive: false // الحساب يحتاج تفعيل من الإدارة
      });
      setSuccessMsg('تم إنشاء الحساب بنجاح! يرجى انتظار تفعيل الإدارة لحسابك.');
      setView('login');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setErrorMsg('هذا البريد مسجل مسبقاً.');
      else if (err.code === 'auth/weak-password') setErrorMsg('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل).');
      else setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a0a', fontFamily: 'Cairo, sans-serif' }}>
      
      {/* الخلفية والأشكال */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(139,26,26,.15), transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(30,58,110,.1), transparent 50%)' }}></div>
      <div className="absolute rounded-full opacity-10 bg-[#8B1A1A] w-64 h-64 top-[10%] left-[20%] blur-[100px]"></div>
      <div className="absolute rounded-full opacity-10 bg-[#1E3A6E] w-80 h-80 top-[40%] right-[15%] blur-[120px]"></div>

      <div className="w-full max-w-md p-8 rounded-2xl border border-[#1f1f1f] bg-[#111] relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <svg viewBox="0 0 340 70" className="w-48 mx-auto mb-4">
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="#8B1A1A"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="#8B1A1A"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="#8B1A1A" opacity=".4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="#8B1A1A" opacity=".4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontWeight="800" fontSize="24">United Experts</text>
          </svg>
          <h1 className="text-xl font-bold text-white mb-1">شركة UX - خبراء المتحدة</h1>
          <p className="text-[#888] text-sm">نظام إدارة المهام والتقويم (مؤمن بالمصادقة الثنائية)</p>
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

        {is2FAWaiting ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-[#1E3A6E]/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#1E3A6E]">
              <span className="text-2xl">📧</span>
            </div>
            <h3 className="text-white font-bold mb-2">في انتظار تأكيد الدخول</h3>
            <p className="text-sm text-gray-400 mb-6">الرجاء التوجه إلى بريدك الإلكتروني والضغط على رابط الدخول السري لإكمال العملية بأمان.</p>
            <button onClick={() => setIs2FAWaiting(false)} className="text-sm text-[#8B1A1A] hover:underline">العودة وتسجيل الدخول بحساب آخر</button>
          </div>
        ) : (
          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="block text-right text-sm text-[#888] mb-1">البريد الإلكتروني</label>
              <input 
                type="email" 
                dir="ltr"
                required
                className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A] transition-colors"
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
                className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A] transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#8B1A1A] to-[#A52A2A] text-white font-bold py-3 rounded-lg hover:from-[#A52A2A] hover:to-[#C03030] transition-all disabled:opacity-50"
            >
              {loading ? 'جاري المعالجة...' : view === 'login' ? 'تأكيد ودخول' : 'إنشاء الحساب'}
            </button>

            <div className="flex justify-between items-center mt-4 text-sm">
              <button type="button" onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-[#1E3A6E] font-bold hover:underline">
                {view === 'login' ? 'إنشاء حساب جديد' : 'لدي حساب بالفعل'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};