// ==========================================
// صفحة تسجيل الدخول (Auth Page)
// تم استعادة حقول التسجيل كاملة + إصلاح مشكلة التوجيه بعد الرابط السحري
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

const DEPARTMENTS = [
  'التسويق', 'المالية والتدقيق', 'الموارد البشرية', 'التكنولوجيا', 'العلاقات العامة', 'الإدارة العليا'
];

export const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // حقول التسجيل المستعادة
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [is2FAWaiting, setIs2FAWaiting] = useState(false);
  const [view, setView] = useState<'login' | 'register'>('login');

  // 1. معالجة الرابط السحري عند العودة من البريد الإلكتروني
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
          
          // 🔥 توجيه جذري إجباري لضمان الدخول للنظام وعدم التعليق في صفحة الدخول 🔥
          setTimeout(() => {
            window.location.href = '/'; 
          }, 1000);

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

  // 2. دالة تسجيل الدخول (التحقق من كلمة المرور ثم إرسال الرابط)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // 1. التحقق من البريد وكلمة المرور
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. التحقق من حالة تفعيل الحساب (isActive) قبل إرسال الرابط
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // نستثني حسابك الأساسي من هذا القيد لضمان عدم قفله
        if (!userData.isActive && userData.email !== 'm.othman@uexperts.sa') {
          setErrorMsg('حسابك لا يزال قيد المراجعة من قبل مدير إدارتك. يرجى الانتظار لحين التفعيل.');
          await signOut(auth); // تسجيل خروجه فوراً
          setLoading(false);
          return;
        }
      }

      // 3. الحساب مفعل والباسورد صحيح، نرسل الرابط السحري
      const actionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      
      await signOut(auth); // تسجيل الخروج مؤقتاً لانتظار ضغطة الرابط
      
      setIs2FAWaiting(true);
      setSuccessMsg('كلمة المرور صحيحة. تم إرسال رابط الدخول النهائي إلى بريدك.');
      
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setErrorMsg('هذا البريد غير مسجل في النظام.');
      else if (err.code === 'auth/wrong-password') setErrorMsg('كلمة المرور غير صحيحة.');
      else if (err.code === 'auth/invalid-credential') setErrorMsg('بيانات الدخول غير صحيحة.');
      else setErrorMsg(`حدث خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. دالة إنشاء حساب جديد بكامل الحقول
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // تخزين بيانات الموظف مع القسم المطلوب لينتظر تفعيل المدير
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: email.toLowerCase(),
        name: name,
        phone: phone,
        department: department,
        primaryRole: 'employee',
        additionalTitles: [],
        isActive: false // قيد المراجعة
      });
      
      setSuccessMsg('تم إنشاء الحساب بنجاح! يرجى انتظار تفعيل الإدارة لحسابك.');
      setView('login');
      // تصفير الحقول
      setPassword('');
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
            <p className="text-sm text-gray-400 mb-6">الرجاء التوجه إلى بريدك الإلكتروني والضغط على الرابط لإكمال الدخول بأمان.</p>
            <button onClick={() => setIs2FAWaiting(false)} className="text-sm text-[#8B1A1A] hover:underline">العودة وإعادة المحاولة</button>
          </div>
        ) : (
          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="flex flex-col gap-4">
            
            {/* حقول إضافية خاصة بالتسجيل فقط */}
            {view === 'register' && (
              <>
                <div>
                  <label className="block text-right text-sm text-[#888] mb-1">الاسم الكامل</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A] transition-colors"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-right text-sm text-[#888] mb-1">رقم الجوال</label>
                  <input 
                    type="text" 
                    dir="ltr"
                    required
                    className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A] transition-colors"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-right text-sm text-[#888] mb-1">الإدارة أو القسم</label>
                  <select 
                    required
                    className="w-full bg-[#151515] border border-[#1f1f1f] text-white rounded-lg p-3 text-sm focus:outline-none focus:border-[#8B1A1A] transition-colors"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* الحقول المشتركة */}
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