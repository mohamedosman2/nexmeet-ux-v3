import React, { useState, useEffect } from 'react';
import { FaSave, FaKey } from 'react-icons/fa';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export const ProfilePage: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setDepartment(userProfile.department || '');
      setAvatarBase64(userProfile.avatarUrl || null);
    }
  }, [userProfile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'حجم الصورة يجب أن يكون أقل من 2 ميجا.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!userProfile?.uid || !name.trim() || !phone.trim()) {
      setProfileMsg({ type: 'error', text: 'يرجى ملء الاسم ورقم الجوال.' });
      return;
    }
    
    try {
      const updates: any = { name, phone, department };
      if (avatarBase64) updates.avatarUrl = avatarBase64;

      await updateDoc(doc(db, 'users', userProfile.uid), updates);
      await updateDoc(doc(db, 'users', userProfile.email), updates);
      
      setProfileMsg({ type: 'success', text: 'تم تحديث الملف الشخصي بنجاح!' });
      setTimeout(() => setProfileMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: 'حدث خطأ أثناء حفظ البيانات.' });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setPassMsg({ type: 'error', text: 'يرجى إدخال كلمة المرور وتأكيدها.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'كلمتا المرور غير متطابقتين.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' });
      return;
    }
    if (!currentUser) return;

    try {
      await updatePassword(currentUser, newPassword);
      setPassMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح!' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassMsg({ type: '', text: '' }), 3000);
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setPassMsg({ type: 'error', text: 'لأسباب أمنية، يرجى تسجيل الخروج والدخول مجدداً لتغيير كلمة المرور.' });
      } else {
        setPassMsg({ type: 'error', text: `خطأ: ${err.message}` });
      }
    }
  };

  const roleDisplay = userProfile?.primaryRole === 'chairman' ? 'رئيس مجلس الإدارة' : 
                      userProfile?.primaryRole === 'vp' ? 'نائب رئيس' : 
                      userProfile?.primaryRole === 'manager' ? 'مدير' : 'موظف';

  return (
    <div className="animate-fadeIn max-w-2xl mx-auto">
      <div className="cd mb-5">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8 border-b border-[#1f1f1f] pb-6">
          <div className="relative group cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-[#8B1A1A] flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-2 border-[#1f1f1f]">
              {avatarBase64 ? <img src={avatarBase64} alt="Avatar" className="w-full h-full object-cover" /> : userProfile?.name?.[0]}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <label className="cursor-pointer text-xs text-white text-center">
                تغيير الصورة
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>
          <div className="text-center md:text-right">
            <h2 className="text-2xl font-bold">{userProfile?.name}</h2>
            <p className="text-sm text-gray-400 mb-2">{userProfile?.email}</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${userProfile?.primaryRole === 'chairman' || userProfile?.primaryRole === 'vp' ? 'bg-[#8B1A1A] text-white' : 'bg-[#1E3A6E] text-white'}`}>
              {roleDisplay} - {userProfile?.department}
            </span>
          </div>
        </div>

        {profileMsg.text && (
          <div className={`p-3 mb-4 text-xs font-bold text-center rounded-lg border ${profileMsg.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
            {profileMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs mb-2 text-gray-400">الاسم الكامل</label>
            <input className="ip" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-2 text-gray-400">البريد الإلكتروني (لا يمكن تغييره)</label>
            <input className="ip opacity-50 cursor-not-allowed" value={userProfile?.email || ''} disabled />
          </div>
          <div>
            <label className="block text-xs mb-2 text-gray-400">رقم الجوال</label>
            <input className="ip" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-2 text-gray-400">الإدارة (يعتمد على الصلاحيات)</label>
            <select className="ip" value={department} onChange={e => setDepartment(e.target.value)} disabled={userProfile?.primaryRole !== 'chairman'}>
              <option value="الإدارة العليا">الإدارة العليا</option>
              <option value="التسويق">التسويق</option>
              <option value="المالية والتدقيق">المالية والتدقيق</option>
              <option value="الموارد البشرية">الموارد البشرية</option>
              <option value="التكنولوجيا">التكنولوجيا</option>
              <option value="العلاقات العامة">العلاقات العامة</option>
            </select>
          </div>
        </div>
        <button onClick={handleSaveProfile} className="bb w-full md:w-auto flex items-center justify-center gap-2">
          <FaSave /> حفظ التعديلات
        </button>
      </div>

      <div className="cd">
        <h3 className="font-bold mb-5 flex items-center gap-2 text-white">
          <FaKey className="text-[#A52A2A]" /> تغيير كلمة المرور السحابية
        </h3>
        
        {passMsg.text && (
          <div className={`p-3 mb-4 text-xs font-bold text-center rounded-lg border ${passMsg.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
            {passMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mb-5">
          <div>
            <label className="block text-xs mb-2 text-gray-400">كلمة المرور الجديدة</label>
            <input type="password" className="ip" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="6 أحرف على الأقل" />
          </div>
          <div>
            <label className="block text-xs mb-2 text-gray-400">تأكيد كلمة المرور</label>
            <input type="password" className="ip" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="أعد كتابة كلمة المرور" />
          </div>
        </div>
        <button onClick={handleChangePassword} className="bb bg-gradient-to-r from-[#1E3A6E] to-[#2A4A8E] hover:from-[#2A4A8E] hover:to-[#3b60b5]">
          تحديث كلمة المرور
        </button>
      </div>
    </div>
  );
};