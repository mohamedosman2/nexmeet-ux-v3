// src/pages/CalendarPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  FaChevronRight, 
  FaChevronLeft, 
  FaPlus, 
  FaCalendarAlt, 
  FaClock, 
  FaBuilding,
  FaTasks,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaEye,
  FaFilter,
  FaDownload,
  FaPrint,
  FaShare,
  FaBell,
  FaStar,
  FaRegStar
} from 'react-icons/fa';

// ==========================================
// الأنواع
// ==========================================

interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'progress' | 'done';
  department: string;
  createdByUid: string;
  assigneesUids: string[];
  mentionsUids: string[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

type ViewMode = 'month' | 'week' | 'day';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
type StatusFilter = 'all' | 'todo' | 'progress' | 'done';

// ==========================================
// الثوابت
// ==========================================

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E'
};
const PRIORITY_LABELS = {
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة'
};
const STATUS_COLORS = {
  todo: '#6B7280',
  progress: '#3B82F6',
  done: '#22C55E'
};
const STATUS_LABELS = {
  todo: 'لم تبدأ',
  progress: 'جارية',
  done: 'مكتملة'
};

// ==========================================
// صفحة التقويم الرئيسية
// ==========================================

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // حالة التقويم
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالة الفلترة
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // حالة النافذة المنبثقة للمهام
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<string>('');
  
  // حالة الإحصائيات
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    highPriorityTasks: 0
  });

  // ==========================================
  // جلب المهام من Firebase في الوقت الفعلي
  // ==========================================
  
  useEffect(() => {
    if (!userProfile) return;
    
    // بناء الاستعلام حسب صلاحيات المستخدم
    let tasksQuery;
    if (userProfile.primaryRole === 'chairman' || userProfile.primaryRole === 'vp') {
      tasksQuery = query(collection(db, 'tasks'), orderBy('date', 'asc'));
    } else {
      tasksQuery = query(
        collection(db, 'tasks'),
        where('department', '==', userProfile.department),
        orderBy('date', 'asc')
      );
    }
    
    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const fetchedTasks: Task[] = [];
      snapshot.forEach((doc) => {
        const task = { id: doc.id, ...doc.data() } as Task;
        
        // فلترة حسب الصلاحيات الإضافية
        const canView = 
          userProfile.primaryRole === 'chairman' ||
          userProfile.primaryRole === 'vp' ||
          task.assigneesUids?.includes(userProfile.uid) ||
          task.createdByUid === userProfile.uid ||
          task.department === userProfile.department;
        
        if (canView) {
          fetchedTasks.push(task);
        }
      });
      
      setTasks(fetchedTasks);
      setLoading(false);
      
      // تحديث الإحصائيات
      const total = fetchedTasks.length;
      const completed = fetchedTasks.filter(t => t.status === 'done').length;
      const pending = fetchedTasks.filter(t => t.status !== 'done').length;
      const highPriority = fetchedTasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
      
      setStats({
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: pending,
        highPriorityTasks: highPriority
      });
    }, (error) => {
      console.error('Error fetching tasks:', error);
      toast.error('حدث خطأ في جلب المهام');
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [userProfile]);

  // ==========================================
  // دوال مساعدة للتقويم
  // ==========================================
  
  // الحصول على أيام الشهر الحالي
  const getCalendarDays = useCallback((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDay = firstDayOfMonth.getDay(); // 0 = الأحد
    const daysInMonth = lastDayOfMonth.getDate();
    
    const calendarDays: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // أيام الشهر السابق
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      calendarDays.push({
        date,
        isCurrentMonth: false,
        isToday: date.toDateString() === today.toDateString(),
        tasks: []
      });
    }
    
    // أيام الشهر الحالي
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter(task => task.date === dateStr);
      
      calendarDays.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        tasks: dayTasks
      });
    }
    
    // أيام الشهر التالي
    const remainingDays = 42 - calendarDays.length; // 6 أسابيع × 7 أيام
    for (let d = 1; d <= remainingDays; d++) {
      const date = new Date(year, month + 1, d);
      calendarDays.push({
        date,
        isCurrentMonth: false,
        isToday: date.toDateString() === today.toDateString(),
        tasks: []
      });
    }
    
    return calendarDays;
  }, [currentDate, tasks]);
  
  // أيام الأسبوع الحالي
  const getWeekDays = useCallback((): CalendarDay[] => {
    const today = new Date(currentDate);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const weekDays: CalendarDay[] = [];
    const currentDateObj = new Date();
    currentDateObj.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayTasks = tasks.filter(task => task.date === dateStr);
      
      weekDays.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === currentDateObj.toDateString(),
        tasks: dayTasks
      });
    }
    
    return weekDays;
  }, [currentDate, tasks]);
  
  // أيام اليوم الحالي
  const getTodayTasks = useCallback((): Task[] => {
    const todayStr = new Date().toISOString().split('T')[0];
    return tasks.filter(task => task.date === todayStr);
  }, [tasks]);
  
  // فلترة المهام حسب الأولوية والحالة
  const filterTasks = useCallback((tasksList: Task[]): Task[] => {
    let filtered = [...tasksList];
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    if (departmentFilter !== 'all' && userProfile?.primaryRole !== 'chairman') {
      filtered = filtered.filter(task => task.department === departmentFilter);
    }
    
    return filtered;
  }, [priorityFilter, statusFilter, departmentFilter, userProfile]);
  
  // ==========================================
  // دوال التحكم في التقويم
  // ==========================================
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };
  
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };
  
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };
  
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setQuickAddDate(date.toISOString().split('T')[0]);
  };
  
  // ==========================================
  // دوال المهام
  // ==========================================
  
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };
  
  const handleQuickAddTask = () => {
    if (!quickAddDate) return;
    navigate(`/tasks?date=${quickAddDate}&quick=true`);
    setShowQuickAddModal(false);
  };
  
  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        toast.success('تم حذف المهمة بنجاح');
        setShowTaskModal(false);
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('حدث خطأ في حذف المهمة');
      }
    }
  };
  
  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
      toast.success('تم تحديث حالة المهمة');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('حدث خطأ في تحديث الحالة');
    }
  };
  
  // ==========================================
  // تصدير التقويم
  // ==========================================
  
  const exportCalendar = () => {
    const calendarData = {
      month: MONTHS[currentDate.getMonth()],
      year: currentDate.getFullYear(),
      tasks: tasks.map(task => ({
        title: task.title,
        date: task.date,
        time: task.time,
        priority: task.priority,
        status: task.status
      }))
    };
    
    const dataStr = JSON.stringify(calendarData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar-${currentDate.getFullYear()}-${currentDate.getMonth() + 1}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير التقويم بنجاح');
  };
  
  const printCalendar = () => {
    window.print();
  };
  
  // ==========================================
  // عرض أيام التقويم (عرض الشهر)
  // ==========================================
  
  const renderMonthView = () => {
    const calendarDays = getCalendarDays();
    const weeks = [];
    
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    
    return (
      <div className="calendar-grid">
        {/* أيام الأسبوع */}
        {DAYS.map(day => (
          <div key={day} className="p-2 text-center text-sm font-semibold" style={{ color: 'var(--tx2)', borderBottom: '1px solid var(--bd)' }}>
            {day}
          </div>
        ))}
        
        {/* أيام الشهر */}
        {weeks.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.map((day, dayIndex) => {
              const filteredDayTasks = filterTasks(day.tasks);
              const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();
              
              return (
                <div
                  key={dayIndex}
                  onClick={() => handleDateClick(day.date)}
                  className={`calendar-day ${!day.isCurrentMonth ? 'opacity-40' : ''} ${day.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium ${day.isToday ? 'text-brand' : ''}`}>
                      {day.date.getDate()}
                    </span>
                    {filteredDayTasks.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--hv)', color: 'var(--tx2)' }}>
                        {filteredDayTasks.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-1 space-y-1">
                    {filteredDayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                        className="text-[10px] p-1 rounded truncate cursor-pointer transition-all hover:scale-105"
                        style={{ 
                          background: `${PRIORITY_COLORS[task.priority]}20`,
                          borderRight: `2px solid ${PRIORITY_COLORS[task.priority]}`
                        }}
                      >
                        {task.title}
                      </div>
                    ))}
                    {filteredDayTasks.length > 3 && (
                      <div className="text-[9px] text-center text-gray-500">
                        +{filteredDayTasks.length - 3} مهام
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };
  
  // ==========================================
  // عرض أيام الأسبوع (عرض الأسبوع)
  // ==========================================
  
  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* رأس الأسبوع */}
          <div className="grid grid-cols-8 border-b" style={{ borderColor: 'var(--bd)' }}>
            <div className="p-2 text-center text-sm font-semibold" style={{ color: 'var(--tx2)' }}>
              الوقت
            </div>
            {weekDays.map((day, index) => (
              <div
                key={index}
                onClick={() => handleDateClick(day.date)}
                className={`p-2 text-center cursor-pointer transition-all ${day.isToday ? 'bg-brand/10 rounded-lg' : ''}`}
              >
                <div className="text-sm font-semibold">{DAYS[day.date.getDay()]}</div>
                <div className={`text-xs ${day.isToday ? 'text-brand font-bold' : 'text-gray-500'}`}>
                  {day.date.getDate()} {MONTHS[day.date.getMonth()]}
                </div>
              </div>
            ))}
          </div>
          
          {/* ساعات اليوم */}
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b" style={{ borderColor: 'var(--bd)' }}>
              <div className="p-2 text-xs text-center" style={{ color: 'var(--tx2)' }}>
                {hour.toString().padStart(2, '0')}:00
              </div>
              {weekDays.map((day, dayIndex) => {
                const hourTasks = filterTasks(day.tasks.filter(task => {
                  const taskHour = parseInt(task.time.split(':')[0]);
                  return taskHour === hour;
                }));
                
                return (
                  <div
                    key={dayIndex}
                    className="p-1 min-h-[60px] cursor-pointer hover:bg-hv transition-colors"
                    onClick={() => {
                      setSelectedDate(day.date);
                      setQuickAddDate(day.date.toISOString().split('T')[0]);
                      setShowQuickAddModal(true);
                    }}
                  >
                    {hourTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                        className="text-[10px] p-1 mb-1 rounded cursor-pointer"
                        style={{ 
                          background: `${PRIORITY_COLORS[task.priority]}20`,
                          borderRight: `2px solid ${PRIORITY_COLORS[task.priority]}`
                        }}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // ==========================================
  // عرض اليوم (عرض اليوم)
  // ==========================================
  
  const renderDayView = () => {
    const todayTasks = filterTasks(getTodayTasks());
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div>
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold">
            {DAYS[new Date().getDay()]}، {new Date().getDate()} {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
          </h3>
        </div>
        
        <div className="space-y-2">
          {hours.map(hour => {
            const hourTasks = todayTasks.filter(task => {
              const taskHour = parseInt(task.time.split(':')[0]);
              return taskHour === hour;
            });
            
            return (
              <div key={hour} className="flex gap-3 p-2 rounded-lg hover:bg-hv transition-colors">
                <div className="w-16 text-sm font-medium" style={{ color: 'var(--tx2)' }}>
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 space-y-1">
                  {hourTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                      style={{ 
                        background: `${PRIORITY_COLORS[task.priority]}15`,
                        borderRight: `3px solid ${PRIORITY_COLORS[task.priority]}`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{task.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
                          background: `${STATUS_COLORS[task.status]}20`,
                          color: STATUS_COLORS[task.status]
                        }}>
                          {STATUS_LABELS[task.status]}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{task.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // ==========================================
  // نافذة عرض تفاصيل المهمة
  // ==========================================
  
  const renderTaskModal = () => {
    if (!selectedTask) return null;
    
    const canEdit = 
      userProfile?.primaryRole === 'chairman' ||
      userProfile?.primaryRole === 'vp' ||
      selectedTask.createdByUid === userProfile?.uid;
    
    return (
      <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
        <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-lg font-bold">تفاصيل المهمة</h3>
            <button onClick={() => setShowTaskModal(false)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body space-y-4">
            {/* العنوان */}
            <div>
              <h4 className="text-xl font-bold">{selectedTask.title}</h4>
              <div className="flex gap-2 mt-2">
                <span className="badge" style={{ background: `${PRIORITY_COLORS[selectedTask.priority]}20`, color: PRIORITY_COLORS[selectedTask.priority] }}>
                  {PRIORITY_LABELS[selectedTask.priority]}
                </span>
                <span className="badge" style={{ background: `${STATUS_COLORS[selectedTask.status]}20`, color: STATUS_COLORS[selectedTask.status] }}>
                  {STATUS_LABELS[selectedTask.status]}
                </span>
                <span className="badge">{selectedTask.department}</span>
              </div>
            </div>
            
            {/* التاريخ والوقت */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-gray-500" />
                <span>{selectedTask.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <FaClock className="text-gray-500" />
                <span>{selectedTask.time}</span>
              </div>
            </div>
            
            {/* الوصف */}
            {selectedTask.description && (
              <div>
                <label className="text-sm text-gray-500">الوصف</label>
                <p className="mt-1 p-3 rounded-lg" style={{ background: 'var(--inp)' }}>
                  {selectedTask.description}
                </p>
              </div>
            )}
            
            {/* تغيير الحالة */}
            {canEdit && (
              <div>
                <label className="text-sm text-gray-500">تغيير الحالة</label>
                <div className="flex gap-2 mt-2">
                  {(['todo', 'progress', 'done'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdateTaskStatus(selectedTask.id, status)}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${selectedTask.status === status ? 'ring-2 ring-brand' : ''}`}
                      style={{ background: `${STATUS_COLORS[status]}20`, color: STATUS_COLORS[status] }}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowTaskModal(false)} className="btn-outline">
              إغلاق
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    navigate(`/tasks?edit=${selectedTask.id}`);
                  }}
                  className="btn-secondary"
                >
                  <FaEdit className="ml-2" /> تعديل
                </button>
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="btn-danger"
                >
                  <FaTrash className="ml-2" /> حذف
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // نافذة إضافة مهمة سريعة
  // ==========================================
  
  const renderQuickAddModal = () => {
    return (
      <div className="modal-overlay" onClick={() => setShowQuickAddModal(false)}>
        <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-lg font-bold">إضافة مهمة جديدة</h3>
            <button onClick={() => setShowQuickAddModal(false)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-primary)/15' }}>
                <FaTasks className="text-brand-light text-2xl" />
              </div>
              <p className="text-gray-500">
                هل تريد إضافة مهمة جديدة في تاريخ <strong>{quickAddDate}</strong>؟
              </p>
            </div>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowQuickAddModal(false)} className="btn-outline">
              إلغاء
            </button>
            <button onClick={handleQuickAddTask} className="btn-primary">
              <FaPlus className="ml-2" /> إضافة مهمة
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* شريط التحكم */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* أزرار التنقل */}
          <button onClick={viewMode === 'month' ? goToPreviousMonth : viewMode === 'week' ? goToPreviousWeek : goToPreviousWeek} className="icon-btn">
            <FaChevronRight />
          </button>
          
          <h2 className="text-lg font-bold min-w-[180px] text-center">
            {viewMode === 'month' && `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {viewMode === 'week' && `الأسبوع ${Math.ceil(currentDate.getDate() / 7)} - ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            {viewMode === 'day' && `${DAYS[new Date().getDay()]}، ${new Date().getDate()} ${MONTHS[new Date().getMonth()]}`}
          </h2>
          
          <button onClick={viewMode === 'month' ? goToNextMonth : viewMode === 'week' ? goToNextWeek : goToNextWeek} className="icon-btn">
            <FaChevronLeft />
          </button>
          
          <button onClick={goToToday} className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-hv" style={{ color: 'var(--brand-primary)' }}>
            اليوم
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* أزرار عرض التقويم */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bd)' }}>
            {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm transition-all ${viewMode === mode ? 'bg-brand text-white' : 'bg-transparent hover:bg-hv'}`}
              >
                {mode === 'month' && 'شهر'}
                {mode === 'week' && 'أسبوع'}
                {mode === 'day' && 'يوم'}
              </button>
            ))}
          </div>
          
          {/* زر الفلترة */}
          <button onClick={() => setShowFilters(!showFilters)} className="icon-btn">
            <FaFilter />
          </button>
          
          {/* زر التصدير */}
          <div className="relative group">
            <button className="icon-btn">
              <FaDownload />
            </button>
            <div className="absolute top-full left-0 mt-1 w-36 rounded-lg shadow-lg overflow-hidden hidden group-hover:block z-10" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)' }}>
              <button onClick={exportCalendar} className="w-full px-3 py-2 text-right text-sm hover:bg-hv transition-colors">
                تصدير كـ JSON
              </button>
              <button onClick={printCalendar} className="w-full px-3 py-2 text-right text-sm hover:bg-hv transition-colors">
                طباعة
              </button>
            </div>
          </div>
          
          {/* زر إضافة مهمة */}
          <button onClick={() => navigate('/tasks')} className="btn-primary">
            <FaPlus className="ml-2" /> مهمة جديدة
          </button>
        </div>
      </div>
      
      {/* لوحة الفلاتر */}
      {showFilters && (
        <div className="card p-4 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">الأولوية:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                className="input text-sm py-1.5"
              >
                <option value="all">الكل</option>
                <option value="high">عالية</option>
                <option value="medium">متوسطة</option>
                <option value="low">منخفضة</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">الحالة:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="input text-sm py-1.5"
              >
                <option value="all">الكل</option>
                <option value="todo">لم تبدأ</option>
                <option value="progress">جارية</option>
                <option value="done">مكتملة</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                setPriorityFilter('all');
                setStatusFilter('all');
                setDepartmentFilter('all');
              }}
              className="text-sm text-brand-light hover:text-brand transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      )}
      
      {/* بطاقات الإحصائيات السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">إجمالي المهام</p>
          <p className="text-xl font-bold">{stats.totalTasks}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">المهام المكتملة</p>
          <p className="text-xl font-bold text-green-500">{stats.completedTasks}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">المهام المتبقية</p>
          <p className="text-xl font-bold text-yellow-500">{stats.pendingTasks}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">مهام عالية الأولوية</p>
          <p className="text-xl font-bold text-red-500">{stats.highPriorityTasks}</p>
        </div>
      </div>
      
      {/* عرض التقويم حسب الوضع */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </>
      )}
      
      {/* النوافذ المنبثقة */}
      {showTaskModal && renderTaskModal()}
      {showQuickAddModal && renderQuickAddModal()}
    </div>
  );
};

export default CalendarPage;