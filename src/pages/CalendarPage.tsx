// ==========================================
// صفحة التقويم (Calendar Page)
// تعرض الأيام والمهام المجدولة بنقاط ملونة حسب الأولوية
// ==========================================
import React, { useState, useEffect } from 'react';
import { FaChevronRight, FaChevronLeft, FaPlus, FaCalendar, FaClock, FaBuilding } from 'react-icons/fa';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Task } from '../types';

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const PRIORITIES = { high: '#EF4444', medium: '#F59E0B', low: '#22C55E' };
const STATUS_COLORS = { todo: '#6B7280', progress: '#3B82F6', done: '#22C55E' };
const STATUS_LABELS = { todo: 'لم تبدأ', progress: 'جارية', done: 'مكتملة' };

export const CalendarPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // حالة التاريخ الحالي
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().split('T')[0]);
  
  // حالة المهام
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // جلب المهام من Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const fetchedTasks: Task[] = [];
      snapshot.forEach(docSnap => {
        fetchedTasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
      });
      setTasks(fetchedTasks);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // دالة الصلاحيات: هل يحق للمستخدم رؤية هذه المهمة؟ (نفس دالة CS في كودك الأصلي)
  const canSeeTask = (task: Task) => {
    if (!userProfile) return false;
    if (userProfile.primaryRole === 'chairman' || userProfile.primaryRole === 'vp') return true;
    if (task.department === userProfile.department) return true;
    if (task.assigneesUids?.includes(userProfile.uid)) return true;
    if (task.createdByUid === userProfile.uid) return true;
    return false;
  };

  const filteredTasks = tasks.filter(canSeeTask);

  // دوال التحكم بالتقويم
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(now.toISOString().split('T')[0]);
  };

  // حساب أيام الشهر
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const todayString = today.toISOString().split('T')[0];

  // تجهيز مربعات التقويم
  const renderCalendarDays = () => {
    const days = [];
    
    // المربعات الفارغة قبل بداية الشهر
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="dy" style={{ background: 'var(--bg)' }}></div>);
    }

    // أيام الشهر الفعلية
    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTasks = filteredTasks.filter(t => t.date === dateString);
      
      const isToday = dateString === todayString;
      const isSelected = dateString === selectedDate;

      days.push(
        <div 
          key={dateString} 
          className={`dy ${isToday ? 'td' : ''} ${isSelected ? 'sl' : ''}`}
          onClick={() => setSelectedDate(dateString)}
        >
          <div className={`text-xs ${isToday ? 'bg-[#8B1A1A] text-white rounded-full flex items-center justify-center font-bold' : ''}`} style={{ width: '24px', height: '24px', color: !isToday ? 'var(--tx2)' : '' }}>
            {d}
          </div>
          
          {/* النقاط الملونة للمهام المطابقة لتصميمك */}
          <div className="flex flex-wrap gap-0.5 mt-1">
            {dayTasks.slice(0, 4).map((t, idx) => (
              <span key={idx} className="td2" style={{ background: PRIORITIES[t.priority] }}></span>
            ))}
            {dayTasks.length > 4 && (
              <span className="text-[9px]" style={{ color: 'var(--tx2)' }}>+{dayTasks.length - 4}</span>
            )}
          </div>
        </div>
      );
    }

    // إكمال المربعات الفارغة لآخر الأسبوع
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        days.push(<div key={`empty-end-${i}`} className="dy" style={{ background: 'var(--bg)' }}></div>);
      }
    }

    return days;
  };

  // المهام الخاصة باليوم المحدد
  const selectedDateTasks = selectedDate ? filteredTasks.filter(t => t.date === selectedDate) : [];

  return (
    <div className="animate-fadeIn">
      {/* شريط التحكم العلوي للتقويم */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={nextMonth} className="tgb">
            <FaChevronRight className="text-xs" />
          </button>
          <h2 className="text-lg font-bold text-center" style={{ minWidth: '160px', color: 'var(--tx)' }}>
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <button type="button" onClick={prevMonth} className="tgb">
            <FaChevronLeft className="text-xs" />
          </button>
          <button type="button" onClick={goToToday} className="text-sm cursor-pointer font-bold" style={{ color: '#A52A2A' }}>
            اليوم
          </button>
        </div>
        <button type="button" onClick={() => navigate('/tasks')} className="bb flex items-center gap-2">
          <FaPlus /> مهمة جديدة
        </button>
      </div>

      {/* أسماء أيام الأسبوع */}
      <div className="grid grid-cols-7 text-center text-xs font-semibold mb-1" style={{ color: 'var(--tx2)' }}>
        <div>أحد</div>
        <div>إثنين</div>
        <div>ثلاثاء</div>
        <div>أربعاء</div>
        <div>خميس</div>
        <div>جمعة</div>
        <div>سبت</div>
      </div>

      {/* شبكة التقويم */}
      <div className="grid grid-cols-7 rounded-xl overflow-hidden" style={{ border: '1px solid var(--bd)' }}>
        {renderCalendarDays()}
      </div>

      {/* المهام المعروضة عند الضغط على يوم معين */}
      {selectedDate && (
        <div className="mt-4 cd fi">
          <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--tx)' }}>مهام {selectedDate}</h4>
          {loading ? (
            <div className="text-xs text-center" style={{ color: 'var(--tx2)' }}>جاري جلب المهام...</div>
          ) : selectedDateTasks.length === 0 ? (
            <div className="text-xs text-center py-4" style={{ color: 'var(--tx2)' }}>لا توجد مهام في هذا اليوم.</div>
          ) : (
            <div className="grid gap-3">
              {selectedDateTasks.map(t => (
                <div key={t.id} className="cd cursor-pointer hover:border-[#8B1A1A] transition-colors" style={{ padding: '12px' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PRIORITIES[t.priority] }}></span>
                        <span className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{t.title}</span>
                        <span className="bg text-[10px]" style={{ background: `${STATUS_COLORS[t.status]}20`, color: STATUS_COLORS[t.status] }}>
                          {STATUS_LABELS[t.status]}
                        </span>
                      </div>
                      <p className="text-xs mb-2 truncate" style={{ color: 'var(--tx2)' }}>{t.description || 'لا يوجد وصف.'}</p>
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--tx2)' }}>
                        <span className="flex items-center gap-1"><FaCalendar /> {t.date}</span>
                        <span className="flex items-center gap-1"><FaClock /> {t.time}</span>
                        <span className="flex items-center gap-1"><FaBuilding /> {t.department}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};