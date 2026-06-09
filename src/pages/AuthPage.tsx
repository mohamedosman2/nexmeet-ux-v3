import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from 'firebase/auth';
import { FaEnvelope, FaLock, FaPhone } from 'react-icons/fa';

// حل مشكلة Typescript مع نافذة المتصفح
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [view, setView] = useState<'login' | 'reset' | 'phone'>('login');

  // تنظيف الكابتشا في حال غيّر المستخدم الشاشة لتجنب تعطل العنصر
  useEffect(() => {
    if (view !== 'phone' && window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  }, [view]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setMessage({ type: 'error', text: `خطأ: ${error.message || error.code}` });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({ type: 'success', text: 'تم إرسال رابط إعادة التعيين لبريدك.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `خطأ: ${error.message || error.code}` });
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 
          size: 'invisible' 
        });
      }
      
      const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      const code = window.prompt('أدخل كود التوثيق المرسل لجوالك:');
      
      if (code) {
        await confirmationResult.confirm(code);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `خطأ: ${error.message || error.code}` });
      // إذا فشلت العملية يجب مسح الكابتشا ليتمكن المستخدم من المحاولة مجدداً
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center text-white" dir="rtl" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-md mx-4 relative z-10 bg-[#151515] border border-[#1f1f1f] rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#8B1A1A]">United Experts</h2>
          <p className="text-sm text-gray-400">نظام إدارة المهام - الدخول للنظام</p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg mb-4 text-xs text-center ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
            {message.text}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleEmailLogin}>
            <div className="mb-4">
              <label className="block text-xs mb-2 text-gray-400">البريد الإلكتروني</label>
              <div className="relative">
                <FaEnvelope className="absolute right-3 top-3 text-gray-500" />
                <input type="email" required className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg py-2.5 pr-10 pl-4" placeholder="example@uexperts.sa" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs mb-2 text-gray-400">كلمة المرور</label>
              <div className="relative">
                <FaLock className="absolute right-3 top-3 text-gray-500" />
                <input type="password" required className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg py-2.5 pr-10 pl-4" placeholder="********" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="w-full bg-[#8B1A1A] text-white font-bold py-3 rounded-lg">تسجيل الدخول</button>
            <div className="flex justify-between mt-4 text-xs">
              <span onClick={() => setView('reset')} className="cursor-pointer text-[#A52A2A]">نسيت كلمة المرور؟</span>
              <span onClick={() => setView('phone')} className="cursor-pointer text-blue-400">الدخول بالجوال</span>
            </div>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <input type="email" required className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg py-2.5 px-4 mb-4" placeholder="أدخل بريدك" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="w-full bg-[#8B1A1A] text-white py-3 rounded-lg mb-2">إرسال رابط الاستعادة</button>
            <button type="button" onClick={() => setView('login')} className="w-full text-gray-400 text-xs">العودة</button>
          </form>
        )}

        {view === 'phone' && (
          <form onSubmit={handlePhoneLogin}>
            <input type="tel" required className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg py-2.5 px-4 mb-4" placeholder="+966..." value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div id="recaptcha-container"></div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg mb-2">إرسال كود التوثيق</button>
            <button type="button" onClick={() => setView('login')} className="w-full text-gray-400 text-xs">العودة</button>
          </form>
        )}
      </div>
    </div>
  );
};