import React, { useState } from 'react';
import { FaChevronRight, FaChevronLeft, FaPlus } from 'react-icons/fa';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // حساب أيام الشهر الحالي
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToday = () => setCurrentDate(new Date());

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full border border-[#1f1f1f] bg-[#151515] flex items-center justify-center text-[#888] hover:text-[#8B1A1A] transition-all">
            <FaChevronRight className="text-xs" />
          </button>
          <h2 className="text-lg font-bold min-w-[160px] text-center">
            {currentDate.toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full border border-[#1f1f1f] bg-[#151515] flex items-center justify-center text-[#888] hover:text-[#8B1A1A] transition-all">
            <FaChevronLeft className="text-xs" />
          </button>
          <button onClick={goToday} className="text-sm cursor-pointer text-[#A52A2A] hover:underline">اليوم</button>
        </div>
        <button className="bg-gradient-to-r from-[#8B1A1A] to-[#A52A2A] text-white px-4 py-2 rounded-lg font-bold text-sm hover:-translate-y-0.5 transition-transform flex items-center">
          <FaPlus className="ml-2" /> مهمة جديدة
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-semibold mb-1 text-[#888]">
        <div>أحد</div><div>إثنين</div><div>ثلاثاء</div><div>أربعاء</div><div>خميس</div><div>جمعة</div><div>سبت</div>
      </div>

      <div className="grid grid-cols-7 rounded-xl overflow-hidden border border-[#1f1f1f]">
        {/* المربعات الفارغة لبداية الشهر */}
        {blanks.map(blank => (
          <div key={`blank-${blank}`} className="min-h-[80px] bg-[#0a0a0a] border border-[#1f1f1f] p-1"></div>
        ))}
        
        {/* أيام الشهر */}
        {days.map(day => {
          const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();
          return (
            <div key={day} className={`min-h-[80px] border border-[#1f1f1f] p-1 cursor-pointer bg-[#151515] hover:bg-[#8B1A1A]/10 transition-colors`}>
              <div className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[#8B1A1A] text-white font-bold' : 'text-[#888]'}`}>
                {day}
              </div>
              {/* مساحة لعرض نقاط المهام مستقبلاً */}
            </div>
          );
        })}
      </div>
    </div>
  );
};