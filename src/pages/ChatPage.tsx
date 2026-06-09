import React from 'react';
import { FaPaperPlane, FaBuilding } from 'react-icons/fa';

export const ChatPage: React.FC = () => {
  return (
    <div className="flex h-[calc(100vh-120px)] rounded-xl border border-[#1f1f1f] overflow-hidden animate-fadeIn">
      
      {/* القائمة الجانبية للمحادثات */}
      <div className="w-64 bg-[#111] border-l border-[#1f1f1f] flex-shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-[#1f1f1f]">
          <input 
            type="text" 
            placeholder="بحث عن محادثة..." 
            className="w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#8B1A1A]"
          />
        </div>
        
        {/* مجموعة الشركة (مثال) */}
        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#8B1A1A]/10 border-r-2 border-[#8B1A1A] bg-[#8B1A1A]/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#8B1A1A] flex items-center justify-center text-white flex-shrink-0">
            <FaBuilding />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">مجموعة الشركة</div>
            <div className="text-[11px] text-[#888] truncate">أبو نواف: موعد اجتماع الإدارة...</div>
          </div>
        </div>
      </div>

      {/* منطقة المحادثة الرئيسية */}
      <div className="flex-1 flex flex-col bg-[#0d0d0d]">
        <div className="h-14 bg-[#111] border-b border-[#1f1f1f] flex items-center px-4 gap-3">
          <div className="w-8 h-8 rounded-full bg-[#8B1A1A] flex items-center justify-center text-white text-xs font-bold">ش</div>
          <div>
            <div className="text-sm font-semibold">مجموعة الشركة</div>
            <div className="text-[10px] text-[#888]">الكل متصل</div>
          </div>
        </div>

        {/* الرسائل */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <div className="flex justify-end">
            <div className="max-w-[75%] p-3 rounded-2xl rounded-bl-sm bg-gradient-to-br from-[#8B1A1A] to-[#6B1010] text-white text-sm">
              مرحباً بالفريق، أرجو تجهيز تقارير الربع الثالث.
              <div className="text-[9px] text-white/60 mt-1">10:00 ص</div>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[75%] p-3 rounded-2xl rounded-br-sm bg-[#1e1e1a] text-[#e8e8e8] text-sm border border-[#1f1f1f]">
              <div className="text-[10px] font-bold text-[#A52A2A] mb-1">علي القحطاني</div>
              تم يا ريس، جاري العمل عليها.
              <div className="text-[9px] text-[#888] mt-1">10:05 ص</div>
            </div>
          </div>
        </div>

        {/* حقل الإدخال */}
        <div className="p-3 border-t border-[#1f1f1f] bg-[#111]">
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#8B1A1A]" 
              placeholder="اكتب رسالة... (@ للإشارة)"
            />
            <button className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#8B1A1A] to-[#A52A2A] flex items-center justify-center text-white hover:scale-105 transition-transform">
              <FaPaperPlane className="text-xs -ml-1" />
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
};