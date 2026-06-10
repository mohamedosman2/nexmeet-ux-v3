import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

declare global { interface Window { recaptchaVerifier: any; } }

export const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [view, setView] = useState<'login' | 'magic' | 'phone'>('login');

  // التحقق مما إذا كان المستخدم ضغط على رابط الدخول السحري (Magic Link)
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('يرجى تأكيد بريدك الإلكتروني لإكمال الدخول:');
      }
      if (emailForSignIn) {
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(() => window.localStorage.removeItem('emailForSignIn'))
          .catch(() => setMessage({ type: 'error', text: 'خطأ في الرابط أو منتهي الصلاحية.' }));
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setMessage({ type: 'error', text: 'بيانات الدخول غير صحيحة.' });
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const actionCodeSettings = {
      url: window.location.origin + '/login', // رابط موقعك للعودة بعد الضغط
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setMessage({ type: 'success', text: 'تم إرسال رابط الدخول (Magic Link) إلى بريدك.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `خطأ: ${error.code}` });
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    }
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      const code = window.prompt('أدخل كود التوثيق المرسل لجوالك (SMS):');
      if (code) await confirmationResult.confirm(code);
    } catch (error: any) {
      setMessage({ type: 'error', text: `فشل الإرسال: ${error.message}` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a] text-[#e8e8e8]" dir="rtl">
      <div className="w-full max-w-md mx-4 bg-[#151515] border border-[#1f1f1f] rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#1E3A6E] mb-2">United Experts</h2>
          <h3 className="text-xl font-bold">شركة UX - خبراء المتحدة</h3>
          <p className="text-sm text-gray-400">نظام إدارة المهام والتقويم</p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg mb-4 text-xs text-center ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
            {message.text}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-xs mb-2 text-gray-400">البريد الإلكتروني</label>
              <input type="email" required className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg py-2.5 px-4" placeholder="example@uexperts.sa" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mb-6">
              <label className="block text-xs mb-2 text-gray-400">كلمة المرور</label>
              <input type="password" required className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg py-2.5 px-4" placeholder="أدخل كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-[#8B1A1A] to-[#A52A2A] text-white font-bold py-3 rounded-lg mb-4 hover:shadow-lg transition-all">تسجيل الدخول</button>
            <div className="flex justify-between text-xs font-semibold">
              <span onClick={() => setView('magic')} className="cursor-pointer text-[#A52A2A]">الدخول بالرابط السحري (Magic Link)</span>
              <span onClick={() => setView('phone')} className="cursor-pointer text-[#1E3A6E]">الدخول بـ SMS</span>
            </div>
          </form>
        )}

        {view === 'magic' && (
          <form onSubmit={handleMagicLink}>
            <label className="block text-xs mb-2 text-gray-400">أدخل بريدك لإرسال رابط الدخول المباشر:</label>
            <input type="email" required className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg py-2.5 px-4 mb-4" placeholder="example@uexperts.sa" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="w-full bg-gradient-to-r from-[#8B1A1A] to-[#A52A2A] text-white py-3 rounded-lg mb-4 font-bold">إرسال رابط الدخول</button>
            <button type="button" onClick={() => setView('login')} className="w-full text-gray-400 text-xs">العودة للخلف</button>
          </form>
        )}

        {view === 'phone' && (
          <form onSubmit={handlePhoneLogin}>
            <label className="block text-xs mb-2 text-gray-400">رقم الجوال (بالصيغة الدولية):</label>
            <input type="tel" required className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg py-2.5 px-4 mb-4" placeholder="+9665xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div id="recaptcha-container"></div>
            <button type="submit" className="w-full bg-[#1E3A6E] text-white py-3 rounded-lg mb-4 font-bold">إرسال كود التوثيق SMS</button>
            <button type="button" onClick={() => setView('login')} className="w-full text-gray-400 text-xs">العودة للخلف</button>
          </form>
        )}
      </div>
    </div>
  );
};