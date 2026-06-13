import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  FaChartLine, 
  FaChartBar, 
  FaChartPie, 
  FaChartArea,
  FaDownload, 
  FaPrint, 
  FaCalendarAlt,
  FaTasks,
  FaVideo,
  FaUsers,
  FaBuilding,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaArrowUp as FaTrendUp,
  FaArrowDown as FaTrendDown,
  FaSpinner,
  FaFileAlt,
  FaFileExcel,
  FaFilePdf,
  FaEnvelope,
  FaWhatsapp,
  FaShare,
  FaFilter,
  FaTimes,
  FaEye,
  FaStar,
  FaUserCheck,
  FaUserPlus,
  FaUserTimes
} from 'react-icons/fa';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { arSA } from 'date-fns/locale';

// ==========================================
// الأنواع
// ==========================================

interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'progress' | 'done';
  department: string;
  createdByUid: string;
  assigneesUids: string[];
  createdAt: number;
  completedAt?: number;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'online' | 'offline';
  attendeesUids: string[];
  createdByUid: string;
  createdAt: number;
}

interface User {
  uid: string;
  name: string;
  email: string;
  department: string;
  primaryRole: string;
  isActive: boolean;
  createdAt: number;
  lastLoginAt?: number;
}

interface Department {
  id: string;
  name: string;
  managerUid: string | null;
  createdAt: number;
}

type ReportType = 'tasks' | 'meetings' | 'users' | 'performance' | 'departments';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

// ==========================================
// صفحة التقارير الرئيسية
// ==========================================

export const ReportsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { isTopManagement } = usePermissions();
  
  // ==========================================
  // حالات التقرير
  // ==========================================
  
  const [activeReport, setActiveReport] = useState<ReportType>('tasks');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // ==========================================
  // بيانات التقارير
  // ==========================================
  
  const [tasksData, setTasksData] = useState<Task[]>([]);
  const [meetingsData, setMeetingsData] = useState<Meeting[]>([]);
  const [usersData, setUsersData] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // ==========================================
  // إحصائيات محسوبة
  // ==========================================
  
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    highPriorityTasks: 0,
    completionRate: 0,
    avgCompletionTime: 0,
    totalMeetings: 0,
    onlineMeetings: 0,
    offlineMeetings: 0,
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisPeriod: 0,
    topPerformingDepartment: '',
    topPerformingUser: ''
  });
  
  // ==========================================
  // بيانات الرسم البياني
  // ==========================================
  
  const [chartData, setChartData] = useState<{
    labels: string[];
    tasks: number[];
    meetings: number[];
    users: number[];
  }>({ labels: [], tasks: [], meetings: [], users: [] });
  
  // ==========================================
  // الحصول على نطاق التواريخ
  // ==========================================
  
  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    
    switch (dateRange) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'week':
        start = subDays(now, 7);
        break;
      case 'month':
        start = subDays(now, 30);
        break;
      case 'quarter':
        start = subMonths(now, 3);
        break;
      case 'year':
        start = subMonths(now, 12);
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : subDays(now, 30);
        end = customEndDate ? new Date(customEndDate) : now;
        break;
      default:
        start = subDays(now, 30);
    }
    
    return { start, end };
  }, [dateRange, customStartDate, customEndDate]);
  
  // ==========================================
  // جلب البيانات
  // ==========================================
  
  useEffect(() => {
    if (!isTopManagement) return;
    
    const fetchData = async () => {
      setLoading(true);
      const { start, end } = getDateRange();
      const startTimestamp = start.getTime();
      const endTimestamp = end.getTime();
      
      try {
        // ==========================================
        // جلب المهام
        // ==========================================
        
        const tasksQuery = query(collection(db, 'tasks'));
        const tasksSnapshot = await getDocs(tasksQuery);
        const allTasks: Task[] = [];
        tasksSnapshot.forEach((doc) => {
          allTasks.push({ id: doc.id, ...doc.data() } as Task);
        });
        
        // فلترة المهام حسب التاريخ
        const filteredTasks = allTasks.filter(task => {
          const taskDate = new Date(task.date).getTime();
          return taskDate >= startTimestamp && taskDate <= endTimestamp;
        });
        setTasksData(filteredTasks);
        
        // ==========================================
        // جلب الاجتماعات
        // ==========================================
        
        const meetingsQuery = query(collection(db, 'meetings'));
        const meetingsSnapshot = await getDocs(meetingsQuery);
        const allMeetings: Meeting[] = [];
        meetingsSnapshot.forEach((doc) => {
          allMeetings.push({ id: doc.id, ...doc.data() } as Meeting);
        });
        
        const filteredMeetings = allMeetings.filter(meeting => {
          const meetingDate = new Date(meeting.date).getTime();
          return meetingDate >= startTimestamp && meetingDate <= endTimestamp;
        });
        setMeetingsData(filteredMeetings);
        
        // ==========================================
        // جلب المستخدمين
        // ==========================================
        
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        const allUsers: User[] = [];
        usersSnapshot.forEach((doc) => {
          allUsers.push({ uid: doc.id, ...doc.data() } as User);
        });
        setUsersData(allUsers);
        
        // ==========================================
        // جلب الإدارات
        // ==========================================
        
        const deptsQuery = query(collection(db, 'departments'));
        const deptsSnapshot = await getDocs(deptsQuery);
        const depts: Department[] = [];
        deptsSnapshot.forEach((doc) => {
          depts.push({ id: doc.id, name: doc.data().name, managerUid: doc.data().managerUid, createdAt: doc.data().createdAt });
        });
        setDepartments(depts);
        
        // ==========================================
        // حساب الإحصائيات
        // ==========================================
        
        calculateStats(filteredTasks, filteredMeetings, allUsers, start, end);
        
        // ==========================================
        // إعداد بيانات الرسم البياني
        // ==========================================
        
        prepareChartData(filteredTasks, filteredMeetings, allUsers, start, end);
        
      } catch (error) {
        console.error('Error fetching report data:', error);
        toast.error('حدث خطأ في جلب بيانات التقرير');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeReport, dateRange, customStartDate, customEndDate, selectedDepartment, isTopManagement]);
  
  // ==========================================
  // حساب الإحصائيات
  // ==========================================
  
  const calculateStats = (tasks: Task[], meetings: Meeting[], users: User[], start: Date, end: Date) => {
    // ==========================================
    // إحصائيات المهام
    // ==========================================
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const pendingTasks = tasks.filter(t => t.status !== 'done').length;
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // متوسط وقت إنجاز المهام (بالساعات)
    const completedWithTime = tasks.filter(t => t.status === 'done' && t.completedAt && t.createdAt);
    const totalCompletionTime = completedWithTime.reduce((sum, t) => sum + (t.completedAt! - t.createdAt), 0);
    const avgCompletionTime = completedWithTime.length > 0 ? totalCompletionTime / completedWithTime.length / (1000 * 60 * 60) : 0;
    
    // ==========================================
    // إحصائيات الاجتماعات
    // ==========================================
    
    const totalMeetings = meetings.length;
    const onlineMeetings = meetings.filter(m => m.type === 'online').length;
    const offlineMeetings = meetings.filter(m => m.type === 'offline').length;
    
    // ==========================================
    // إحصائيات المستخدمين
    // ==========================================
    
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const newUsersThisPeriod = users.filter(u => u.createdAt >= start.getTime() && u.createdAt <= end.getTime()).length;
    
    // ==========================================
    // أفضل إدارة أداءً
    // ==========================================
    
    const deptPerformance = new Map<string, { completed: number; total: number }>();
    tasks.forEach(task => {
      const existing = deptPerformance.get(task.department) || { completed: 0, total: 0 };
      existing.total++;
      if (task.status === 'done') existing.completed++;
      deptPerformance.set(task.department, existing);
    });
    
    let topDept = '';
    let topDeptRate = 0;
    deptPerformance.forEach((value, key) => {
      const rate = value.total > 0 ? (value.completed / value.total) * 100 : 0;
      if (rate > topDeptRate) {
        topDeptRate = rate;
        topDept = key;
      }
    });
    
    // ==========================================
    // أفضل مستخدم أداءً
    // ==========================================
    
    const userPerformance = new Map<string, { completed: number; total: number }>();
    tasks.forEach(task => {
      task.assigneesUids?.forEach(uid => {
        const existing = userPerformance.get(uid) || { completed: 0, total: 0 };
        existing.total++;
        if (task.status === 'done') existing.completed++;
        userPerformance.set(uid, existing);
      });
    });
    
    let topUser = '';
    let topUserRate = 0;
    userPerformance.forEach((value, key) => {
      const rate = value.total > 0 ? (value.completed / value.total) * 100 : 0;
      if (rate > topUserRate) {
        topUserRate = rate;
        topUser = users.find(u => u.uid === key)?.name || '';
      }
    });
    
    // ==========================================
    // تحديث حالة الإحصائيات
    // ==========================================
    
    setStats({
      totalTasks,
      completedTasks,
      pendingTasks,
      highPriorityTasks,
      completionRate,
      avgCompletionTime,
      totalMeetings,
      onlineMeetings,
      offlineMeetings,
      totalUsers,
      activeUsers,
      newUsersThisPeriod,
      topPerformingDepartment: topDept,
      topPerformingUser: topUser
    });
  };
  
  // ==========================================
  // إعداد بيانات الرسم البياني
  // ==========================================
  
  const prepareChartData = (tasks: Task[], meetings: Meeting[], users: User[], start: Date, end: Date) => {
    // ==========================================
    // إنشاء مصفوفة الأيام في النطاق
    // ==========================================
    
    const days = eachDayOfInterval({ start, end });
    const labels: string[] = [];
    for (let i = 0; i < days.length; i++) {
      labels.push(format(days[i], 'dd/MM', { locale: arSA }));
    }
    
    // ==========================================
    // حساب المهام لكل يوم
    // ==========================================
    
    const tasksByDay: number[] = [];
    for (let i = 0; i < days.length; i++) {
      const dayStr = format(days[i], 'yyyy-MM-dd');
      const count = tasks.filter(t => t.date === dayStr).length;
      tasksByDay.push(count);
    }
    
    // ==========================================
    // حساب الاجتماعات لكل يوم
    // ==========================================
    
    const meetingsByDay: number[] = [];
    for (let i = 0; i < days.length; i++) {
      const dayStr = format(days[i], 'yyyy-MM-dd');
      const count = meetings.filter(m => m.date === dayStr).length;
      meetingsByDay.push(count);
    }
    
    // ==========================================
    // حساب المستخدمين التراكمي لكل يوم
    // ==========================================
    
    const usersByDay: number[] = [];
    for (let i = 0; i < days.length; i++) {
      const dayTimestamp = days[i].getTime();
      const count = users.filter(u => {
        const createdAt = new Date(u.createdAt);
        return createdAt <= days[i];
      }).length;
      usersByDay.push(count);
    }
    
    // ==========================================
    // تحديث حالة الرسم البياني
    // ==========================================
    
    setChartData({
      labels: labels,
      tasks: tasksByDay,
      meetings: meetingsByDay,
      users: usersByDay
    });
  };
  
  // ==========================================
  // تصدير التقرير إلى CSV
  // ==========================================
  
  const exportToCSV = async () => {
    setExporting(true);
    
    try {
      let data: any[] = [];
      
      if (activeReport === 'tasks') {
        for (let i = 0; i < tasksData.length; i++) {
          const task = tasksData[i];
          data.push({
            العنوان: task.title,
            التاريخ: task.date,
            الوقت: task.time,
            الأولوية: task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة',
            الحالة: task.status === 'todo' ? 'لم تبدأ' : task.status === 'progress' ? 'جارية' : 'مكتملة',
            الإدارة: task.department
          });
        }
      } else if (activeReport === 'meetings') {
        for (let i = 0; i < meetingsData.length; i++) {
          const meeting = meetingsData[i];
          data.push({
            العنوان: meeting.title,
            التاريخ: meeting.date,
            الوقت: meeting.time,
            النوع: meeting.type === 'online' ? 'عن بُعد' : 'حضوري',
            عدد_المشاركين: meeting.attendeesUids?.length || 0
          });
        }
      } else if (activeReport === 'users') {
        for (let i = 0; i < usersData.length; i++) {
          const user = usersData[i];
          if (selectedDepartment === 'all' || user.department === selectedDepartment) {
            data.push({
              الاسم: user.name,
              البريد: user.email,
              الإدارة: user.department,
              الدور: user.primaryRole === 'chairman' ? 'رئيس' : user.primaryRole === 'vp' ? 'نائب رئيس' : user.primaryRole === 'manager' ? 'مدير' : 'موظف',
              الحالة: user.isActive ? 'نشط' : 'غير نشط',
              تاريخ_الانضمام: format(user.createdAt, 'dd/MM/yyyy', { locale: arSA })
            });
          }
        }
      } else if (activeReport === 'performance') {
        data.push({ المقياس: 'إجمالي المهام', القيمة: stats.totalTasks });
        data.push({ المقياس: 'المهام المكتملة', القيمة: stats.completedTasks });
        data.push({ المقياس: 'نسبة الإنجاز', القيمة: `${stats.completionRate.toFixed(1)}%` });
        data.push({ المقياس: 'متوسط وقت الإنجاز', القيمة: `${stats.avgCompletionTime.toFixed(1)} ساعة` });
        data.push({ المقياس: 'إجمالي الاجتماعات', القيمة: stats.totalMeetings });
        data.push({ المقياس: 'المستخدمين النشطين', القيمة: stats.activeUsers });
        data.push({ المقياس: 'أفضل إدارة', القيمة: stats.topPerformingDepartment || '-' });
        data.push({ المقياس: 'أفضل موظف', القيمة: stats.topPerformingUser || '-' });
      } else if (activeReport === 'departments') {
        for (let i = 0; i < departments.length; i++) {
          const dept = departments[i];
          const deptTasks = tasksData.filter(t => t.department === dept.name);
          const completed = deptTasks.filter(t => t.status === 'done').length;
          const rate = deptTasks.length > 0 ? (completed / deptTasks.length) * 100 : 0;
          data.push({
            الإدارة: dept.name,
            عدد_المهام: deptTasks.length,
            المهام_المكتملة: completed,
            نسبة_الإنجاز: `${rate.toFixed(1)}%`
          });
        }
      }
      
      if (data.length === 0) {
        toast.error('لا توجد بيانات للتصدير');
        setExporting(false);
        return;
      }
      
      // ==========================================
      // إنشاء ملف CSV
      // ==========================================
      
      const headers = Object.keys(data[0]);
      let csvRows: string[] = [];
      let headerRow = '';
      for (let i = 0; i < headers.length; i++) {
        if (i > 0) headerRow += ',';
        headerRow += headers[i];
      }
      csvRows.push(headerRow);
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        let rowStr = '';
        for (let j = 0; j < headers.length; j++) {
          if (j > 0) rowStr += ',';
          const value = row[headers[j]];
          if (typeof value === 'string') {
            rowStr += `"${value.replace(/"/g, '""')}"`;
          } else {
            rowStr += value;
          }
        }
        csvRows.push(rowStr);
      }
      
      const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${activeReport}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('تم تصدير التقرير بنجاح');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('حدث خطأ في تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };
  
  // ==========================================
  // طباعة التقرير
  // ==========================================
  
  const printReport = () => {
    window.print();
  };
  
  // ==========================================
  // مكون بطاقة الإحصائيات
  // ==========================================
  
  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; trend?: number }> = ({ 
    title, 
    value, 
    icon, 
    color, 
    trend 
  }) => {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend !== undefined && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend >= 0 ? <FaTrendUp size={10} /> : <FaTrendDown size={10} />}
                {Math.abs(trend)}%
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${color}20`, color: color }}>
            {icon}
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // مكون الرسم البياني
  // ==========================================
  
  const ChartView: React.FC = () => {
    let maxValue = 1;
    for (let i = 0; i < chartData.tasks.length; i++) {
      if (chartData.tasks[i] > maxValue) maxValue = chartData.tasks[i];
      if (chartData.meetings[i] > maxValue) maxValue = chartData.meetings[i];
      if (chartData.users[i] > maxValue) maxValue = chartData.users[i];
    }
    
    return (
      <div className="card">
        <h3 className="font-bold mb-4">التحليل الزمني</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex items-end gap-1 h-64">
              {chartData.labels.map((label, idx) => {
                const tasksHeight = (chartData.tasks[idx] / maxValue) * 150;
                const meetingsHeight = (chartData.meetings[idx] / maxValue) * 150;
                const usersHeight = (chartData.users[idx] / maxValue) * 100;
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5">
                      <div 
                        className="w-full bg-blue-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${tasksHeight}px`, maxHeight: '150px' }}
                        title={`المهام: ${chartData.tasks[idx]}`}
                      />
                      <div 
                        className="w-full bg-green-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${meetingsHeight}px`, maxHeight: '150px' }}
                        title={`الاجتماعات: ${chartData.meetings[idx]}`}
                      />
                      <div 
                        className="w-full bg-purple-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${usersHeight}px`, maxHeight: '100px' }}
                        title={`المستخدمين: ${chartData.users[idx]}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 rotate-45 origin-left whitespace-nowrap">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded"></div><span>المهام</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div><span>الاجتماعات</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded"></div><span>المستخدمين</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // عرض تقرير المهام
  // ==========================================
  
  const TasksReport: React.FC = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="إجمالي المهام" value={stats.totalTasks} icon={<FaTasks size={24} />} color="#3B82F6" />
          <StatCard title="المهام المكتملة" value={stats.completedTasks} icon={<FaCheckCircle size={24} />} color="#22C55E" />
          <StatCard title="نسبة الإنجاز" value={`${stats.completionRate.toFixed(1)}%`} icon={<FaChartLine size={24} />} color="#8B1A1A" />
          <StatCard title="مهام عالية الأولوية" value={stats.highPriorityTasks} icon={<FaExclamationTriangle size={24} />} color="#EF4444" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--bd)' }}>
                <th className="text-right p-3">العنوان</th>
                <th className="text-right p-3">التاريخ</th>
                <th className="text-right p-3">الوقت</th>
                <th className="text-right p-3">الأولوية</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">الإدارة</th>
               </tr>
            </thead>
            <tbody>
              {tasksData.slice(0, 20).map((task) => {
                return (
                  <tr key={task.id} className="border-b hover:bg-hv transition-colors" style={{ borderColor: 'var(--bd)' }}>
                    <td className="p-3">{task.title}</td>
                    <td className="p-3">{task.date}</td>
                    <td className="p-3">{task.time}</td>
                    <td className="p-3">
                      <span className={`badge ${task.priority === 'high' ? 'badge-danger' : task.priority === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                        {task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`badge ${task.status === 'done' ? 'badge-success' : task.status === 'progress' ? 'badge-info' : 'badge'}`}>
                        {task.status === 'done' ? 'مكتملة' : task.status === 'progress' ? 'جارية' : 'لم تبدأ'}
                      </span>
                    </td>
                    <td className="p-3">{task.department}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {tasksData.length > 20 && (
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">يعرض أول 20 مهمة فقط</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // ==========================================
  // عرض تقرير الاجتماعات
  // ==========================================
  
  const MeetingsReport: React.FC = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard title="إجمالي الاجتماعات" value={stats.totalMeetings} icon={<FaVideo size={24} />} color="#3B82F6" />
          <StatCard title="اجتماعات عن بُعد" value={stats.onlineMeetings} icon={<FaVideo size={24} />} color="#22C55E" />
          <StatCard title="اجتماعات حضورية" value={stats.offlineMeetings} icon={<FaBuilding size={24} />} color="#F59E0B" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--bd)' }}>
                <th className="text-right p-3">العنوان</th>
                <th className="text-right p-3">التاريخ</th>
                <th className="text-right p-3">الوقت</th>
                <th className="text-right p-3">النوع</th>
                <th className="text-right p-3">المشاركين</th>
               </tr>
            </thead>
            <tbody>
              {meetingsData.slice(0, 20).map((meeting) => {
                return (
                  <tr key={meeting.id} className="border-b hover:bg-hv transition-colors" style={{ borderColor: 'var(--bd)' }}>
                    <td className="p-3">{meeting.title}</td>
                    <td className="p-3">{meeting.date}</td>
                    <td className="p-3">{meeting.time}</td>
                    <td className="p-3">
                      <span className={`badge ${meeting.type === 'online' ? 'badge-success' : 'badge-info'}`}>
                        {meeting.type === 'online' ? 'عن بُعد' : 'حضوري'}
                      </span>
                    </td>
                    <td className="p-3">{meeting.attendeesUids?.length || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {meetingsData.length > 20 && (
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">يعرض أول 20 اجتماع فقط</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // ==========================================
  // عرض تقرير المستخدمين
  // ==========================================
  
  const UsersReport: React.FC = () => {
    let filteredUsers = usersData;
    if (selectedDepartment !== 'all') {
      filteredUsers = usersData.filter(user => user.department === selectedDepartment);
    }
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="إجمالي المستخدمين" value={stats.totalUsers} icon={<FaUsers size={24} />} color="#3B82F6" />
          <StatCard title="مستخدمين نشطين" value={stats.activeUsers} icon={<FaUserCheck size={24} />} color="#22C55E" />
          <StatCard title="مستخدمين جدد" value={stats.newUsersThisPeriod} icon={<FaUserPlus size={24} />} color="#8B1A1A" />
          <StatCard title="غير نشطين" value={stats.totalUsers - stats.activeUsers} icon={<FaUserTimes size={24} />} color="#EF4444" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--bd)' }}>
                <th className="text-right p-3">الاسم</th>
                <th className="text-right p-3">البريد</th>
                <th className="text-right p-3">الإدارة</th>
                <th className="text-right p-3">الدور</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">تاريخ الانضمام</th>
               </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                let roleText = 'موظف';
                if (user.primaryRole === 'chairman') roleText = 'رئيس';
                else if (user.primaryRole === 'vp') roleText = 'نائب رئيس';
                else if (user.primaryRole === 'manager') roleText = 'مدير';
                
                let roleClass = 'badge';
                if (user.primaryRole === 'chairman') roleClass = 'badge badge-primary';
                else if (user.primaryRole === 'manager') roleClass = 'badge badge-info';
                
                return (
                  <tr key={user.uid} className="border-b hover:bg-hv transition-colors" style={{ borderColor: 'var(--bd)' }}>
                    <td className="p-3">{user.name}</td>
                    <td className="p-3 text-gray-500">{user.email}</td>
                    <td className="p-3">{user.department}</td>
                    <td className="p-3">
                      <span className={roleClass}>{roleText}</span>
                    </td>
                    <td className="p-3">
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-warning'}`}>
                        {user.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="p-3">{format(user.createdAt, 'dd/MM/yyyy', { locale: arSA })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // عرض تقرير الأداء
  // ==========================================
  
  const PerformanceReport: React.FC = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard title="نسبة إنجاز المهام" value={`${stats.completionRate.toFixed(1)}%`} icon={<FaChartLine size={24} />} color="#8B1A1A" />
          <StatCard title="متوسط وقت الإنجاز" value={`${stats.avgCompletionTime.toFixed(1)} ساعة`} icon={<FaClock size={24} />} color="#3B82F6" />
          <StatCard title="أفضل إدارة" value={stats.topPerformingDepartment || '-'} icon={<FaBuilding size={24} />} color="#22C55E" />
          <StatCard title="أفضل موظف" value={stats.topPerformingUser || '-'} icon={<FaStar size={24} />} color="#F59E0B" />
        </div>
        
        <ChartView />
      </div>
    );
  };
  
  // ==========================================
  // عرض تقرير الإدارات
  // ==========================================
  
  const DepartmentsReport: React.FC = () => {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--bd)' }}>
                <th className="text-right p-3">الإدارة</th>
                <th className="text-right p-3">عدد المهام</th>
                <th className="text-right p-3">المهام المكتملة</th>
                <th className="text-right p-3">نسبة الإنجاز</th>
                <th className="text-right p-3">عدد الموظفين</th>
               </tr>
            </thead>
            <tbody>
              {departments.map((dept) => {
                const deptTasks = tasksData.filter(t => t.department === dept.name);
                const completed = deptTasks.filter(t => t.status === 'done').length;
                const rate = deptTasks.length > 0 ? (completed / deptTasks.length) * 100 : 0;
                const employeeCount = usersData.filter(u => u.department === dept.name && u.isActive).length;
                
                return (
                  <tr key={dept.id} className="border-b hover:bg-hv transition-colors" style={{ borderColor: 'var(--bd)' }}>
                    <td className="p-3 font-medium">{dept.name}</td>
                    <td className="p-3">{deptTasks.length}</td>
                    <td className="p-3">{completed}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--hv)' }}>
                          <div className="h-full rounded-full bg-brand" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs">{rate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="p-3">{employeeCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // التحقق من الصلاحيات
  // ==========================================
  
  if (!isTopManagement) {
    return (
      <div className="text-center py-12">
        <FaChartLine className="text-6xl mx-auto mb-4 text-gray-500" />
        <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
        <p className="text-gray-500">التقارير متاحة للإدارة العليا فقط</p>
      </div>
    );
  }
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* ==========================================
           الرأس
      ========================================== */}
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">التقارير والإحصائيات</h1>
          <p className="text-gray-500 text-sm mt-1">تحليل أداء الشركة والمستخدمين</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToCSV} disabled={exporting} className="btn-secondary">
            {exporting ? <FaSpinner className="animate-spin ml-2" /> : <FaDownload className="ml-2" />}
            تصدير
          </button>
          <button onClick={printReport} className="icon-btn">
            <FaPrint size={16} />
          </button>
        </div>
      </div>
      
      {/* ==========================================
           تبويبات التقارير
      ========================================== */}
      
      <div className="flex flex-wrap gap-2 border-b" style={{ borderColor: 'var(--bd)' }}>
        <button
          onClick={() => setActiveReport('tasks')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeReport === 'tasks' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaTasks className="inline ml-2" size={14} /> المهام
        </button>
        <button
          onClick={() => setActiveReport('meetings')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeReport === 'meetings' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaVideo className="inline ml-2" size={14} /> الاجتماعات
        </button>
        <button
          onClick={() => setActiveReport('users')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeReport === 'users' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaUsers className="inline ml-2" size={14} /> المستخدمين
        </button>
        <button
          onClick={() => setActiveReport('performance')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeReport === 'performance' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaChartLine className="inline ml-2" size={14} /> الأداء
        </button>
        <button
          onClick={() => setActiveReport('departments')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeReport === 'departments' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaBuilding className="inline ml-2" size={14} /> الإدارات
        </button>
      </div>
      
      {/* ==========================================
           فلاتر التاريخ
      ========================================== */}
      
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-gray-500" />
            <span className="text-sm">الفترة:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDateRange('today')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${dateRange === 'today' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
            >
              اليوم
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${dateRange === 'week' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
            >
              أسبوع
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${dateRange === 'month' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
            >
              شهر
            </button>
            <button
              onClick={() => setDateRange('quarter')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${dateRange === 'quarter' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
            >
              ربع سنة
            </button>
            <button
              onClick={() => setDateRange('year')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${dateRange === 'year' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
            >
              سنة
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${dateRange === 'custom' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
            >
              مخصص
            </button>
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input text-sm py-1"
                placeholder="من تاريخ"
              />
              <span>إلى</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input text-sm py-1"
                placeholder="إلى تاريخ"
              />
            </div>
          )}
          
          {(activeReport === 'users' || activeReport === 'departments') && (
            <div className="flex items-center gap-2 mr-auto">
              <FaBuilding className="text-gray-500" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="input text-sm py-1"
              >
                <option value="all">جميع الإدارات</option>
                {departments.map((dept) => {
                  return <option key={dept.id} value={dept.name}>{dept.name}</option>;
                })}
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* ==========================================
           محتوى التقرير
      ========================================== */}
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {activeReport === 'tasks' && <TasksReport />}
          {activeReport === 'meetings' && <MeetingsReport />}
          {activeReport === 'users' && <UsersReport />}
          {activeReport === 'performance' && <PerformanceReport />}
          {activeReport === 'departments' && <DepartmentsReport />}
        </>
      )}
    </div>
  );
};

export default ReportsPage;