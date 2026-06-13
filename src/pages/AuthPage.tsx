// src/pages/AuthPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, sendMagicLink } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  FaEnvelope, 
  FaLock, 
  FaUser, 
  FaPhone, 
  FaBuilding, 
  FaArrowRight, 
  FaArrowLeft,
  FaGoogle,
  FaApple,
  FaGithub,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaSpinner,
  FaMagic,
  FaSms,
  FaWhatsapp,
  FaShieldAlt
} from 'react-icons/fa';

// ==========================================
// الثوابت
// ==========================================

const DEPARTMENTS = [
  'التسويق',
  'المالية والتدقيق',
  'الموارد البشرية',
  'التكنولوجيا',
  'العلاقات العامة',
  'الإدارة العليا'
];

type AuthMode = 'login' | 'register' | 'forgot' | 'magic-link' | 'phone';
type VerificationStep = 'request' | 'verify' | 'success';

// ==========================================
// صفحة المصادقة الرئيسية
// ==========================================

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, login, resetPassword, refreshUserProfile } = useAuth();
  
  // حالة الواجهة
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // حقول النماذج
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // حقول المصادقة بالهاتف
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('request');
  const [recaptchaContainer, setRecaptchaContainer] = useState<HTMLElement | null>(null);
  
  // رسائل الخطأ والنجاح
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // التحقق من وجود مستخدم مسجل الدخول
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // تهيئة reCAPTCHA للمصادقة بالهاتف
  useEffect(() => {
    if (mode === 'phone' && !recaptchaContainer) {
      const container = document.createElement('div');
      container.id = 'recaptcha-container';
      container.style.position = 'fixed';
      container.style.bottom = '-100px';
      container.style.right = '-100px';
      document.body.appendChild(container);
      setRecaptchaContainer(container);
      
      return () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };
    }
  }, [mode]);

  // ==========================================
  // دوال المصادقة
  // ==========================================

  // تسجيل الدخول بالبريد وكلمة المرور
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
      await refreshUserProfile();
      toast.success('تم تسجيل الدخول بنجاح!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      switch (err.code) {
        case 'auth/user-not-found':
          setError('البريد الإلكتروني غير مسجل في النظام');
          break;
        case 'auth/wrong-password':
          setError('كلمة المرور غير صحيحة');
          break;
        case 'auth/too-many-requests':
          setError('تم حظر تسجيل الدخول مؤقتاً. يرجى المحاولة لاحقاً');
          break;
        case 'auth/invalid-email':
          setError('البريد الإلكتروني غير صحيح');
          break;
        default:
          setError(err.message || 'حدث خطأ في تسجيل الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  // تسجيل الدخول بالرابط السحري (Magic Link)
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await sendMagicLink(email);
      setSuccess('تم إرسال رابط تسجيل الدخول إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.');
      setTimeout(() => {
        setMode('login');
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      console.error('Magic link error:', err);
      switch (err.code) {
        case 'auth/invalid-email':
          setError('البريد الإلكتروني غير صحيح');
          break;
        case 'auth/user-not-found':
          setError('البريد الإلكتروني غير مسجل في النظام');
          break;
        default:
          setError(err.message || 'حدث خطأ في إرسال الرابط السحري');
      }
    } finally {
      setLoading(false);
    }
  };

  // طلب رمز التحقق للهاتف
  const requestPhoneVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error('يرجى إدخال رقم الجوال');
      return;
    }
    
    // تنسيق رقم الجوال
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      formattedPhone = `+966${phone.replace(/^0+/, '')}`;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (!recaptchaContainer) {
        throw new Error('reCAPTCHA not initialized');
      }
      
      const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA resolved');
        }
      });
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setVerificationStep('verify');
      toast.success('تم إرسال رمز التحقق إلى جوالك');
    } catch (err: any) {
      console.error('Phone verification error:', err);
      setError(err.message || 'حدث خطأ في إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  // التحقق من رمز الهاتف
  const verifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      toast.error('يرجى إدخال رمز التحقق');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (!confirmationResult) {
        throw new Error('No confirmation result');
      }
      
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      // التحقق من وجود المستخدم في Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // مستخدم موجود - تسجيل دخول
        await refreshUserProfile();
        toast.success('تم تسجيل الدخول بنجاح!');
        navigate('/dashboard');
      } else {
        // مستخدم جديد - إنشاء حساب
        setMode('register');
        setEmail(user.email || '');
        setVerificationStep('success');
        toast.success('تم التحقق من رقم الجوال! يرجى إكمال التسجيل');
      }
    } catch (err: any) {
      console.error('Code verification error:', err);
      setError('رمز التحقق غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  // إنشاء حساب جديد
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من صحة المدخلات
    if (!name || !email || !password || !phone || !department) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    
    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // إنشاء المستخدم في Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // إنشاء ملف تعريف المستخدم في Firestore
      const userProfile = {
        uid: user.uid,
        name: name,
        email: email.toLowerCase(),
        phone: phone,
        department: department,
        primaryRole: 'employee',
        additionalTitles: [],
        isActive: false, // يحتاج إلى موافقة الإدارة
        avatarUrl: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      // إرسال بريد تأكيد
      await sendEmailVerification(user);
      
      // إنشاء طلب انضمام
      const joinRequest = {
        uid: user.uid,
        name: name,
        email: email.toLowerCase(),
        phone: phone,
        department: department,
        status: 'pending_manager',
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'joinRequests', user.uid), joinRequest);
      
      toast.success('تم إنشاء الحساب بنجاح! يرجى انتظار موافقة الإدارة');
      setMode('login');
      
      // تنظيف الحقول
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPhone('');
      
    } catch (err: any) {
      console.error('Register error:', err);
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('هذا البريد الإلكتروني مسجل مسبقاً');
          break;
        case 'auth/weak-password':
          setError('كلمة المرور ضعيفة جداً');
          break;
        case 'auth/invalid-email':
          setError('البريد الإلكتروني غير صحيح');
          break;
        default:
          setError(err.message || 'حدث خطأ في إنشاء الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  // إعادة تعيين كلمة المرور
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('يرجى إدخال البريد الإلكتروني');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await resetPassword(email);
      setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
      setTimeout(() => {
        setMode('login');
        setSuccess('');
      }, 5000);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      switch (err.code) {
        case 'auth/user-not-found':
          setError('البريد الإلكتروني غير مسجل في النظام');
          break;
        case 'auth/invalid-email':
          setError('البريد الإلكتروني غير صحيح');
          break;
        default:
          setError(err.message || 'حدث خطأ في إرسال رابط إعادة التعيين');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // الخلفيات المتحركة
  // ==========================================
  
  const FloatingShapes = () => (
    <>
      <div className="floating-shape" style={{ width: '300px', height: '300px', background: '#8B1A1A', top: '10%', right: '10%' }}></div>
      <div className="floating-shape" style={{ width: '200px', height: '200px', background: '#1E3A6E', bottom: '15%', left: '15%' }}></div>
      <div className="floating-shape" style={{ width: '250px', height: '250px', background: '#A52A2A', top: '40%', left: '40%', opacity: '0.05' }}></div>
      <div className="floating-shape" style={{ width: '150px', height: '150px', background: '#3B82F6', bottom: '30%', right: '20%', opacity: '0.03' }}></div>
    </>
  );

  // ==========================================
  // عرض نموذج تسجيل الدخول
  // ==========================================
  
  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-5">
      {/* حقل البريد الإلكتروني */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          البريد الإلكتروني
        </label>
        <div className="relative">
          <FaEnvelope className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pr-10"
            placeholder="example@uexperts.sa"
            dir="ltr"
            required
          />
        </div>
      </div>
      
      {/* حقل كلمة المرور */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          كلمة المرور
        </label>
        <div className="relative">
          <FaLock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pr-10"
            placeholder="أدخل كلمة المرور"
            dir="ltr"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-brand"
          >
            {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
          </button>
        </div>
      </div>
      
      {/* خيار تذكرني ونسيت كلمة المرور */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 text-brand focus:ring-brand"
          />
          <span className="text-sm text-gray-500">تذكرني</span>
        </label>
        <button
          type="button"
          onClick={() => setMode('forgot')}
          className="text-sm text-brand-light hover:text-brand transition-colors"
        >
          نسيت كلمة المرور؟
        </button>
      </div>
      
      {/* زر تسجيل الدخول */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? (
          <FaSpinner className="animate-spin" size={18} />
        ) : (
          <>
            تسجيل الدخول <FaArrowLeft className="mr-2" />
          </>
        )}
      </button>
      
      {/* خيارات تسجيل الدخول الإضافية */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: 'var(--bd)' }}></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2" style={{ background: 'var(--bg3)', color: 'var(--tx2)' }}>
            أو سجل باستخدام
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setMode('magic-link')}
          className="py-2 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-105"
          style={{ background: 'var(--hv)', border: '1px solid var(--bd)' }}
        >
          <FaMagic className="text-brand" size={14} />
          <span className="text-xs">رابط سحري</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('phone')}
          className="py-2 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-105"
          style={{ background: 'var(--hv)', border: '1px solid var(--bd)' }}
        >
          <FaPhone className="text-green-500" size={14} />
          <span className="text-xs">رقم الجوال</span>
        </button>
        <button
          type="button"
          className="py-2 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-105 opacity-50 cursor-not-allowed"
          style={{ background: 'var(--hv)', border: '1px solid var(--bd)' }}
          disabled
        >
          <FaGoogle className="text-red-500" size={14} />
          <span className="text-xs">Google</span>
        </button>
      </div>
      
      {/* رابط إنشاء حساب */}
      <div className="text-center mt-6">
        <p className="text-sm text-gray-500">
          ليس لديك حساب؟
          <button
            type="button"
            onClick={() => setMode('register')}
            className="mr-2 text-brand hover:text-brand-light font-semibold transition-colors"
          >
            إنشاء حساب جديد
          </button>
        </p>
      </div>
    </form>
  );

  // ==========================================
  // عرض نموذج التسجيل
  // ==========================================
  
  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="space-y-4">
      {/* الاسم الكامل */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          الاسم الكامل
        </label>
        <div className="relative">
          <FaUser className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input pr-10"
            placeholder="أدخل اسمك الكامل"
            required
          />
        </div>
      </div>
      
      {/* البريد الإلكتروني */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          البريد الإلكتروني
        </label>
        <div className="relative">
          <FaEnvelope className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pr-10"
            placeholder="example@uexperts.sa"
            dir="ltr"
            required
          />
        </div>
      </div>
      
      {/* رقم الجوال */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          رقم الجوال
        </label>
        <div className="relative">
          <FaPhone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input pr-10"
            placeholder="05xxxxxxxx"
            dir="ltr"
            required
          />
        </div>
      </div>
      
      {/* الإدارة */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          الإدارة
        </label>
        <div className="relative">
          <FaBuilding className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="input pr-10 appearance-none"
            required
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* كلمة المرور */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          كلمة المرور
        </label>
        <div className="relative">
          <FaLock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pr-10"
            placeholder="6 أحرف على الأقل"
            dir="ltr"
            required
          />
        </div>
      </div>
      
      {/* تأكيد كلمة المرور */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          تأكيد كلمة المرور
        </label>
        <div className="relative">
          <FaLock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input pr-10"
            placeholder="أعد كتابة كلمة المرور"
            dir="ltr"
            required
          />
        </div>
      </div>
      
      {/* زر التسجيل */}
      <button
        type="submit"
        disabled={loading}
        className="btn-secondary w-full py-3 text-base"
      >
        {loading ? (
          <FaSpinner className="animate-spin" size={18} />
        ) : (
          <>
            إنشاء حساب <FaArrowLeft className="mr-2" />
          </>
        )}
      </button>
      
      {/* رابط العودة */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => setMode('login')}
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          لديك حساب بالفعل؟ تسجيل الدخول
        </button>
      </div>
    </form>
  );

  // ==========================================
  // عرض نموذج الرابط السحري
  // ==========================================
  
  const renderMagicLinkForm = () => (
    <form onSubmit={handleMagicLink} className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 26, 26, 0.15)' }}>
          <FaMagic className="text-brand-light text-2xl" />
        </div>
        <h3 className="text-lg font-bold mb-2">تسجيل الدخول برابط سحري</h3>
        <p className="text-sm text-gray-500">
          سنرسل رابطاً سحرياً إلى بريدك الإلكتروني يمكنك من خلاله تسجيل الدخول مباشرة
        </p>
      </div>
      
      {/* حقل البريد الإلكتروني */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          البريد الإلكتروني
        </label>
        <div className="relative">
          <FaEnvelope className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pr-10"
            placeholder="example@uexperts.sa"
            dir="ltr"
            required
          />
        </div>
      </div>
      
      {/* زر إرسال الرابط */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? (
          <FaSpinner className="animate-spin" size={18} />
        ) : (
          <>
            إرسال الرابط السحري <FaArrowLeft className="mr-2" />
          </>
        )}
      </button>
      
      {/* رابط العودة */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => setMode('login')}
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          العودة إلى تسجيل الدخول
        </button>
      </div>
    </form>
  );

  // ==========================================
  // عرض نموذج التحقق بالهاتف
  // ==========================================
  
  const renderPhoneVerificationForm = () => (
    <form onSubmit={verificationStep === 'request' ? requestPhoneVerification : verifyPhoneCode} className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 26, 26, 0.15)' }}>
          <FaPhone className="text-brand-light text-2xl" />
        </div>
        <h3 className="text-lg font-bold mb-2">تسجيل الدخول برقم الجوال</h3>
        <p className="text-sm text-gray-500">
          {verificationStep === 'request' 
            ? 'سنرسل رمز تحقق إلى رقم جوالك لتسجيل الدخول' 
            : 'أدخل رمز التحقق الذي تلقيته على جوالك'}
        </p>
      </div>
      
      {verificationStep === 'request' ? (
        <>
          {/* حقل رقم الجوال */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
              رقم الجوال
            </label>
            <div className="relative">
              <FaPhone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input pr-10"
                placeholder="05xxxxxxxx"
                dir="ltr"
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? (
              <FaSpinner className="animate-spin" size={18} />
            ) : (
              <>
                إرسال رمز التحقق <FaArrowLeft className="mr-2" />
              </>
            )}
          </button>
        </>
      ) : (
        <>
          {/* حقل رمز التحقق */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
              رمز التحقق
            </label>
            <div className="relative">
              <FaShieldAlt className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="input pr-10 text-center text-2xl tracking-widest"
                placeholder="000000"
                dir="ltr"
                maxLength={6}
                required
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? (
              <FaSpinner className="animate-spin" size={18} />
            ) : (
              <>
                التحقق وتسجيل الدخول <FaArrowLeft className="mr-2" />
              </>
            )}
          </button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => setVerificationStep('request')}
              className="text-sm text-gray-500 hover:text-brand transition-colors"
            >
              لم يصلك رمز؟ إعادة إرسال
            </button>
          </div>
        </>
      )}
      
      {/* رابط العودة */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => setMode('login')}
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          العودة إلى تسجيل الدخول
        </button>
      </div>
    </form>
  );

  // ==========================================
  // عرض نموذج استعادة كلمة المرور
  // ==========================================
  
  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 26, 26, 0.15)' }}>
          <FaLock className="text-brand-light text-2xl" />
        </div>
        <h3 className="text-lg font-bold mb-2">استعادة كلمة المرور</h3>
        <p className="text-sm text-gray-500">
          أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
        </p>
      </div>
      
      {/* حقل البريد الإلكتروني */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--tx2)' }}>
          البريد الإلكتروني
        </label>
        <div className="relative">
          <FaEnvelope className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input pr-10"
            placeholder="example@uexperts.sa"
            dir="ltr"
            required
          />
        </div>
      </div>
      
      {/* زر الإرسال */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? (
          <FaSpinner className="animate-spin" size={18} />
        ) : (
          <>
            إرسال رابط الاستعادة <FaArrowLeft className="mr-2" />
          </>
        )}
      </button>
      
      {/* رابط العودة */}
      <div className="text-center mt-4">
        <button
          type="button"
          onClick={() => setMode('login')}
          className="text-sm text-gray-500 hover:text-brand transition-colors"
        >
          تذكرت كلمة المرور؟ تسجيل الدخول
        </button>
      </div>
    </form>
  );

  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ background: 'var(--lg)' }}>
      <FloatingShapes />
      
      {/* زر تبديل الوضع (للتطوير) */}
      <button
        onClick={() => {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
          localStorage.setItem('ux4_th', isDark ? 'light' : 'dark');
        }}
        className="fixed top-4 left-4 z-20 icon-btn"
        aria-label="تبديل الوضع"
      >
        {document.documentElement.getAttribute('data-theme') === 'light' ? <FaMoon /> : <FaSun />}
      </button>
      
      {/* بطاقة المصادقة */}
      <div className="w-full max-w-md mx-4 z-10 animate-fadeIn">
        
        {/* الشعار */}
        <div className="text-center mb-8">
          <svg viewBox="0 0 340 70" className="w-64 mx-auto mb-4">
            <defs>
              <linearGradient id="authGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#8B1A1A' }}/>
                <stop offset="100%" style={{ stopColor: '#C03030' }}/>
              </linearGradient>
            </defs>
            <path d="M8 35 Q30 5,55 35 Q30 65,8 35" fill="url(#authGradient)"/>
            <path d="M285 35 Q307 5,332 35 Q307 65,285 35" fill="url(#authGradient)"/>
            <path d="M50 35 Q72 12,95 35 Q72 58,50 35" fill="url(#authGradient)" opacity="0.4"/>
            <path d="M245 35 Q267 12,290 35 Q267 58,245 35" fill="url(#authGradient)" opacity="0.4"/>
            <text x="170" y="42" textAnchor="middle" fill="#1E3A6E" fontFamily="Cairo" fontWeight="800" fontSize="26">
              United Experts
            </text>
          </svg>
          <h1 className="text-xl font-bold text-white mb-1">شركة UX - خبراء المتحدة</h1>
          <p className="text-sm" style={{ color: 'var(--tx2)' }}>نظام إدارة المهام والتقويم المتكامل</p>
        </div>
        
        {/* عرض الرسائل */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-center animate-fadeIn" style={{ background: 'var(--error-bg)', border: '1px solid var(--error)', color: 'var(--error)' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 rounded-lg text-sm text-center animate-fadeIn" style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)' }}>
            <div className="flex items-center justify-center gap-2">
              <FaCheckCircle />
              <span>{success}</span>
            </div>
          </div>
        )}
        
        {/* البطاقة الرئيسية */}
        <div className="card animate-slideInUp">
          {/* العنوان حسب الوضع */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">
              {mode === 'login' && 'تسجيل الدخول إلى حسابك'}
              {mode === 'register' && 'إنشاء حساب جديد'}
              {mode === 'forgot' && 'استعادة كلمة المرور'}
              {mode === 'magic-link' && 'تسجيل الدخول برابط سحري'}
              {mode === 'phone' && 'تسجيل الدخول برقم الجوال'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {mode === 'login' && 'أدخل بياناتك للوصول إلى لوحة التحكم'}
              {mode === 'register' && 'املأ البيانات التالية لإنشاء حساب جديد'}
              {mode === 'forgot' && 'سنرسل لك رابطاً لإعادة تعيين كلمة المرور'}
              {mode === 'magic-link' && 'أدخل بريدك الإلكتروني لتلقي رابط سحري'}
              {mode === 'phone' && 'أدخل رقم جوالك لتلقي رمز التحقق'}
            </p>
          </div>
          
          {/* عرض النموذج المناسب */}
          {mode === 'login' && renderLoginForm()}
          {mode === 'register' && renderRegisterForm()}
          {mode === 'forgot' && renderForgotPasswordForm()}
          {mode === 'magic-link' && renderMagicLinkForm()}
          {mode === 'phone' && renderPhoneVerificationForm()}
        </div>
        
        {/* حقوق الملكية */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            © 2024 شركة UX - خبراء المتحدة. جميع الحقوق محفوظة
          </p>
        </div>
      </div>
      
      {/* حاوية reCAPTCHA للمصادقة بالهاتف */}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default AuthPage;