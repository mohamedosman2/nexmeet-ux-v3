import React, { useState } from 'react';
import { FaSave, FaKey } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

export const ProfilePage: React.FC = () => {
  const { userProfile } = useAuth();
  const [name, setName] = useState(userProfile?.name || 'محمد آل نصار');
  const [phone, setPhone] = useState(userProfile?.phone || '+966539303952');

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl p-6 mb-4">
        <h3 className="font-bold text-base mb-4 border-b border-[#1f1f1f] pb-2 text-gray-200">البيانات الوظيفية والشخصية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">الاسم الكامل</label>
            <input type="text" className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-2.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">البريد الإلكتروني (ثابت مؤسسياً)</label>
            <input type="email" className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2.5 text-sm text-gray-500 cursor-not-allowed" value={userProfile?.email || 'mohd@uexperts.sa'} disabled />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">رقم الجوال الموثق</label>
            <input type="text" className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-2.5 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">الإدارة الحالية</label>
            <input type="text" className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2.5 text-sm text-gray-500 cursor-not-allowed" value={userProfile?.department || 'الإدارة العليا'} disabled />
          </div>
        </div>
        <button className="bg-gradient-to-r from-[#8B1A1A] to-[#A52A2A] text-white text-xs font-bold px-4 py-2.5 rounded-lg mt-4 flex items-center gap-2">
          <FaSave /> حفظ التعديلات الشخصية
        </button>
      </div>

      <div className="bg-[#151515] border border-[#1f1f1f] rounded-xl p-6">
        <h3 className="font-bold text-base mb-4 border-b border-[#1f1f1f] pb-2 text-gray-200 flex items-center gap-2"><FaKey className="text-[#A52A2A]" /> تحديث الأمان السيبراني لكلمة المرور</h3>
        <div className="grid grid-cols-1 gap-3 max-w-sm">
          <input type="password" placeholder="كلمة المرور الحالية" className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-2.5 text-sm" />
          <input type="password" placeholder="كلمة المرور الجديدة" className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-2.5 text-sm" />
          <input type="password" placeholder="تأكيد كلمة المرور الجديدة" className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg p-2.5 text-sm" />
        </div>
        <button className="bg-[#111] border border-[#1f1f1f] hover:bg-[#8B1A1A]/10 text-white text-xs font-bold px-4 py-2.5 rounded-lg mt-4">
          تحديث كلمة المرور
        </button>
      </div>
    </div>
  );
};