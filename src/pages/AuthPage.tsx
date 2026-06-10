// ==========================================
// ملف واجهة المصادقة والدخول (AuthPage)
// يتضمن: الدخول، التسجيل، الرابط السحري، SMS، واستعادة كلمة المرور
// ==========================================
import React, { useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// تعريف لمتغيرات النافذة لتجنب أخطاء TypeScript مع الكابتشا
declare global { interface Window { recaptchaVerifier: any; } }

export const AuthPage: React.FC = () => {
  // حالات الشاشات المختلفة
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'magic' | 'phone'>('login');
  
  // حالات إدخال البيانات
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [dept, setDept] = useState('الإدارة العليا');
  const [message, setMessage] = useState({ type: '', text: '' });

  // التحقق من الرابط السحري (Magic Link) عند تحميل الصفحة
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('يرجى إدخال بريدك الإلكتروني لتأكيد عملية الدخول:');
      }
      if (emailForSignIn) {
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(() => window.localStorage.removeItem('emailForSignIn'))
          .catch((err: any) => setMessage({ type: 'error', text: `خطأ في الرابط أو منتهي الصلاحية: ${err.message}` }));
      }
    }
  }, []);

  // 1. تسجيل الدخول العادي
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'بيانات الدخول غير صحيحة، تأكد من البريد وكلمة المرور.' });
    }
  };

  // 2. إنشاء حساب جديد (يحوله تلقائياً لحالة قيد المراجعة)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setMessage({ type: 'error', text: 'كلمتا المرور غير متطابقتين.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' });
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const newProfile = {
        uid: user.uid,
        name,
        email: email.toLowerCase(),
        phone,
        department: dept,
        primaryRole: 'employee', // يتم تسجيله كموظف افتراضياً
        additionalTitles: [],
        isActive: false // قيد المراجعة (لن يفتح له النظام)
      };

      await setDoc(doc(db, "users", user.uid), newProfile);
      await setDoc(doc(db, "users", email.toLowerCase()), newProfile);
      // سيلتقطه AuthContext تلقائياً ويعرض شاشة المراجعة
    } catch (err: any) {
      setMessage({ type: 'error', text: `خطأ في التسجيل: ${err.message}` });
    }
  };

  // 3. الدخول برقم الجوال (SMS)
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    }
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      const code = window.prompt('أدخل الكود المكون من 6 أرقام المرسل لجوالك:');
      if (code) {
        await confirmationResult.confirm(code);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `فشل الإرسال، تأكد من كتابة الرقم بالصيغة الدولية (+966...): ${err.message}` });
    }
  };

  // 4. الدخول بالرابط السحري (Magic Link)
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const actionCodeSettings = {
      url: window.location.origin + '/login',
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setMessage({ type: 'success', text: 'تم إرسال رابط الدخول السحري لبريدك، تفقد صندوق الوارد.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `خطأ في إرسال الرابط: ${err.message}` });
    }
  };

  // 5. استعادة كلمة المرور
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({ type: 'success', text: 'تم إرسال رابط إعادة التعيين لبريدك الإلكتروني.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `خطأ: ${err.message}` });
    }
  };

  // دالة تبديل الثيم الشكلي
  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', currentTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div style={{ background: 'var(--lg)' }} className="fixed inset-0 z-50 flex items-center justify-center font-cairo" dir="rtl">
      {/* الدوائر المتحركة في الخلفية من تصميمك الأصلي */}
      <div className="fs" style={{ width: '300px', height: '300px', background: '#8B1A1A', top: '10%', right: '10%' }}></div>
      <div className="fs" style={{ width: '200px', height: '200px', background: '#1E3A6E', bottom: '15%', left: '15%' }}></div>
      
      {/* زر تبديل الثيم */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
        <button type="button" className="tgb" onClick={toggleTheme}>
          <i className="fas fa-moon"></i>
        </button>
      </div>

      <div className="fi w-full max-w-md mx-4 relative z-10">
        <div className="text-center mb-8">
          <svg viewBox="0 0 340 70" className="w-64 mx-auto mb-3">
            <defs>
              <linearGradient id="ag" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#8B1A1A' }} />
                <stop offset="100%" style={{ stopColor: '#C03030' }} />
              </linearGradient>
            </defs>
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="url(#ag)" />
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="url(#ag)" />
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="url(#ag)" opacity=".4" />
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="url(#ag)" opacity=".4" />
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="26">United Experts</text>
          </svg>
          <h2 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>شركة UX - خبراء المتحدة</h2>
          <p className="text-sm" style={{ color: 'var(--tx2)' }}>نظام إدارة المهام والتقويم</p>
        </div>

        {message.text && (
          <div className={`p-3 mb-5 text-sm font-bold text-center rounded-lg border ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
            {message.text}
          </div>
        )}

        {view === 'login' && (
          <div className="cd">
            <form onSubmit={handleLogin}>
              <div className="mb-5">
                <label className="block text-sm mb-2" style={{ color: 'var(--tx2)' }}>البريد الإلكتروني</label>
                <input type="email" required className="ip" placeholder="example@uexperts.sa" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="mb-5">
                <label className="block text-sm mb-2" style={{ color: 'var(--tx2)' }}>كلمة المرور</label>
                <input type="password" required className="ip" placeholder="أدخل كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button type="submit" className="bb w-full" style={{ padding: '12px' }}>تسجيل الدخول</button>
              
              <div className="flex justify-between mt-4 text-sm font-bold">
                <span onClick={() => { setView('forgot'); setMessage({ type: '', text: '' }); }} className="cursor-pointer" style={{ color: '#A52A2A' }}>نسيت كلمة المرور؟</span>
                <span onClick={() => { setView('register'); setMessage({ type: '', text: '' }); }} className="cursor-pointer" style={{ color: '#1E3A6E' }}>إنشاء حساب جديد</span>
              </div>
              
              <div className="flex justify-between mt-4 pt-4 text-xs font-bold" style={{ borderTop: '1px solid var(--bd)' }}>
                <span onClick={() => { setView('magic'); setMessage({ type: '', text: '' }); }} className="cursor-pointer" style={{ color: 'var(--tx2)' }}><i className="fas fa-magic ml-1"></i>رابط سحري</span>
                <span onClick={() => { setView('phone'); setMessage({ type: '', text: '' }); }} className="cursor-pointer" style={{ color: 'var(--tx2)' }}><i className="fas fa-sms ml-1"></i>دخول بـ SMS</span>
              </div>
            </form>
          </div>
        )}

        {view === 'register' && (
          <div className="cd">
            <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--tx)' }}>إنشاء حساب جديد</h3>
            <form onSubmit={handleRegister}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input required className="ip" placeholder="الاسم الكامل" value={name} onChange={e => setName(e.target.value)} />
                <input required type="email" className="ip" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input required type="password" className="ip" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} />
                <input required type="password" className="ip" placeholder="تأكيد المرور" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <input required type="tel" className="ip" placeholder="رقم الجوال (+966...)" value={phone} onChange={e => setPhone(e.target.value)} />
                <select className="ip" value={dept} onChange={e => setDept(e.target.value)}>
                  <option value="الإدارة العليا">الإدارة العليا</option>
                  <option value="التسويق">التسويق</option>
                  <option value="المالية والتدقيق">المالية والتدقيق</option>
                  <option value="الموارد البشرية">الموارد البشرية</option>
                  <option value="التكنولوجيا">التكنولوجيا</option>
                  <option value="العلاقات العامة">العلاقات العامة</option>
                </select>
              </div>
              <button type="submit" className="bb w-full" style={{ padding: '12px' }}>تقديم الطلب</button>
              <span onClick={() => setView('login')} className="block text-center text-sm cursor-pointer mt-3 font-bold" style={{ color: '#1E3A6E' }}>العودة لتسجيل الدخول</span>
            </form>
          </div>
        )}

        {view === 'phone' && (
          <div className="cd">
            <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--tx)' }}>الدخول السريع برقم الجوال</h3>
            <form onSubmit={handlePhoneLogin}>
              <label className="block text-xs mb-2" style={{ color: 'var(--tx2)' }}>الرقم بالصيغة الدولية (مثال: 966500000000+)</label>
              <input type="tel" required className="ip mb-4" placeholder="+9665xxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} />
              <div id="recaptcha-container"></div>
              <button type="submit" className="bb w-full" style={{ padding: '12px', background: 'linear-gradient(135deg, #1E3A6E, #2A4A8E)' }}>إرسال كود التوثيق</button>
              <span onClick={() => setView('login')} className="block text-center text-sm cursor-pointer mt-3 font-bold" style={{ color: 'var(--tx2)' }}>العودة</span>
            </form>
          </div>
        )}

        {view === 'magic' && (
          <div className="cd">
            <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--tx)' }}>الدخول بدون كلمة مرور</h3>
            <form onSubmit={handleMagicLink}>
              <label className="block text-xs mb-2" style={{ color: 'var(--tx2)' }}>أدخل بريدك لإرسال رابط تسجيل الدخول المباشر:</label>
              <input type="email" required className="ip mb-4" placeholder="example@uexperts.sa" value={email} onChange={e => setEmail(e.target.value)} />
              <button type="submit" className="bb w-full" style={{ padding: '12px' }}>إرسال الرابط السحري</button>
              <span onClick={() => setView('login')} className="block text-center text-sm cursor-pointer mt-3 font-bold" style={{ color: 'var(--tx2)' }}>العودة</span>
            </form>
          </div>
        )}

        {view === 'forgot' && (
          <div className="cd">
            <h3 className="text-lg font-bold mb-5" style={{ color: 'var(--tx)' }}>إعادة تعيين كلمة المرور</h3>
            <form onSubmit={handleResetPassword}>
              <input type="email" required className="ip mb-4" placeholder="بريدك الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} />
              <button type="submit" className="bb w-full" style={{ padding: '12px' }}>إرسال رابط الاستعادة</button>
              <span onClick={() => setView('login')} className="block text-center text-sm cursor-pointer mt-3 font-bold" style={{ color: '#1E3A6E' }}>العودة</span>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};