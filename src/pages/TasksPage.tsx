// ==========================================
// صفحة المهام (Tasks Page)
// تتضمن عرض المهام، الفلترة، وإضافة/تعديل المهام مع المنشن والمرفقات
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import { 
  FaPlus, FaInbox, FaTimes, FaSave, FaFile, 
  FaTrash, FaEdit, FaBuilding, FaUser, FaCalendar, FaClock, FaCloudUploadAlt, FaDownload 
} from 'react-icons/fa';
import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { Task, UserProfile, Department } from '../types';

const PRIORITIES = { high: '#EF4444', medium: '#F59E0B', low: '#22C55E' };
const PRIORITY_LABELS = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
const STATUS_COLORS = { todo: '#6B7280', progress: '#3B82F6', done: '#22C55E' };
const STATUS_LABELS = { todo: 'لم تبدأ', progress: 'جارية', done: 'مكتملة' };

export const TasksPage: React.FC = () => {
  const { userProfile } = useAuth();
  
  // الحالات الأساسية (State)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // حالات النافذة المنبثقة (Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);

  // حقول نموذج الإدخال (Form Fields)
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [status, setStatus] = useState<'todo' | 'progress' | 'done'>('todo');
  const [mentions, setMentions] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [files, setFiles] = useState<{ name: string; type: string; url: string }[]>([]);

  // حالات البحث عن المنشن والمسؤولين
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDrop, setShowMentionDrop] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [showAssigneeDrop, setShowAssigneeDrop] = useState(false);

  // جلب البيانات من السحابة في الوقت الفعلي
  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const fetchedTasks: Task[] = [];
      snapshot.forEach(docSnap => fetchedTasks.push({ id: docSnap.id, ...docSnap.data() } as Task));
      setTasks(fetchedTasks);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: UserProfile[] = [];
      snapshot.forEach(docSnap => fetchedUsers.push({ ...docSnap.data(), uid: docSnap.id } as UserProfile));
      setUsers(fetchedUsers);
    });

    // إدارات ثابتة كمثال لكودك، يمكن جلبها من السحابة لاحقاً
    setDepartments([
      { id: 'd1', name: 'الموارد البشرية', managerUid: null },
      { id: 'd2', name: 'التسويق', managerUid: null },
      { id: 'd3', name: 'المالية والتدقيق', managerUid: null },
      { id: 'd4', name: 'التكنولوجيا', managerUid: null },
      { id: 'd5', name: 'العلاقات العامة', managerUid: null },
      { id: 'd6', name: 'الإدارة العليا', managerUid: null }
    ]);

    return () => { unsubTasks(); unsubUsers(); };
  }, []);

  // التحقق من صلاحية رؤية المهمة
  const canSeeTask = (task: Task) => {
    if (!userProfile) return false;
    if (userProfile.primaryRole === 'chairman' || userProfile.primaryRole === 'vp') return true;
    if (task.department === userProfile.department) return true;
    if (task.assigneesUids?.includes(userProfile.uid)) return true;
    if (task.cr === userProfile.uid) return true; // cr: createdBy
    return false;
  };

  const visibleTasks = tasks.filter(canSeeTask).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const filteredTasks = filter === 'all' ? visibleTasks : visibleTasks.filter(t => t.department === filter);

  // الفلاتر المتاحة بناءً على صلاحية المستخدم
  const availableFilters = userProfile?.primaryRole === 'chairman' || userProfile?.primaryRole === 'vp'
    ? departments.map(d => d.name)
    : [userProfile?.department || ''];

  // فتح نافذة الإضافة/التعديل
  const openModal = (task?: Task) => {
    if (task) {
      setEditTaskId(task.id);
      setTitle(task.title);
      setDate(task.date);
      setTime(task.time);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setMentions(task.mentionsUids || []);
      setAssignees(task.assigneesUids || []);
      setFiles(task.files || []);
    } else {
      setEditTaskId(null);
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('09:00');
      setDescription('');
      setPriority('medium');
      setStatus('todo');
      setMentions([]);
      setAssignees([]);
      setFiles([]);
    }
    setViewTask(null);
    setIsModalOpen(true);
  };

  // حفظ المهمة سحابياً
  const handleSaveTask = async () => {
    if (!title || !date || !time) {
      alert('يرجى ملء الحقول الأساسية (العنوان، التاريخ، الوقت)');
      return;
    }
    const taskData = {
      title, date, time, description, priority, status,
      department: userProfile?.primaryRole === 'chairman' || userProfile?.primaryRole === 'vp' ? 'الإدارة العليا' : userProfile?.department,
      cr: userProfile?.uid, // المنشئ
      assigneesUids: assignees,
      mentionsUids: mentions,
      files,
      createdAt: Date.now()
    };

    try {
      if (editTaskId) {
        await updateDoc(doc(db, 'tasks', editTaskId), taskData);
      } else {
        await addDoc(collection(db, 'tasks'), taskData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ المهمة.');
    }
  };

  // حذف المهمة
  const handleDeleteTask = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه المهمة نهائياً؟')) {
      try {
        await deleteDoc(doc(db, 'tasks', id));
        setViewTask(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // رفع الملفات (نظام مبسط للحفاظ على الكفاءة)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    Array.from(selectedFiles).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`حجم الملف ${file.name} كبير جداً (أكثر من 5 ميجا)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFiles(prev => [...prev, { name: file.name, type: file.type, url: event.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // دالة لجلب معلومات المستخدم من المعرف
  const getUserInfo = (uid: string) => users.find(u => u.uid === uid);

  return (
    <div className="animate-fadeIn">
      {/* شريط الفلاتر والإضافة */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-5 gap-4">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter('all')} className={`tb ${filter === 'all' ? 'ac' : ''}`}>الكل ({visibleTasks.length})</button>
          {availableFilters.map(d => (
            <button key={d} onClick={() => setFilter(d)} className={`tb ${filter === d ? 'ac' : ''}`}>
              {d} ({visibleTasks.filter(t => t.department === d).length})
            </button>
          ))}
        </div>
        <button onClick={() => openModal()} className="bb flex items-center gap-2">
          <FaPlus /> مهمة جديدة
        </button>
      </div>

      {/* قائمة المهام */}
      <div id="tL" className="grid gap-3">
        {loading ? (
          <div className="text-center py-16 text-gray-500">جاري جلب المهام سحابياً...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FaInbox className="text-4xl mx-auto mb-3" />
            <p>لا توجد مهام حالياً</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} onClick={() => setViewTask(task)} className="cd cursor-pointer hover:border-[#8B1A1A] transition-colors" style={{ padding: '12px' }}>
              <div className="flex items-start justify-between gap-3">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PRIORITIES[task.priority] }}></span>
                    <span className="font-semibold text-sm">{task.title}</span>
                    <span className="bg text-[10px]" style={{ background: `${STATUS_COLORS[task.status]}20`, color: STATUS_COLORS[task.status] }}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                  <p className="text-xs mb-2 truncate" style={{ color: 'var(--tx2)' }}>{task.description || 'لا يوجد وصف'}</p>
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--tx2)' }}>
                    <span className="flex items-center gap-1"><FaCalendar /> {task.date}</span>
                    <span className="flex items-center gap-1"><FaClock /> {task.time}</span>
                    <span className="flex items-center gap-1"><FaBuilding /> {task.department}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px]" style={{ color: 'var(--tx2)' }}>{getUserInfo(task.cr)?.name || ''}</span>
                  <div className="flex" style={{ gap: '2px' }}>
                    {task.assigneesUids?.slice(0, 3).map(uid => (
                      <div key={uid} title={getUserInfo(uid)?.name} style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(139,26,26,.5)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#fff' }}>
                        {getUserInfo(uid)?.name?.[0] || '?'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* نافذة عرض المهمة (View Task) */}
      {viewTask && (
        <div className="mo z-50">
          <div className="mc fi p-6 relative w-full max-w-lg">
            <div className="flex items-center justify-between mb-4 border-b border-[#1f1f1f] pb-3">
              <h3 className="text-lg font-bold">{viewTask.title}</h3>
              <FaTimes className="cursor-pointer text-gray-500 hover:text-white" onClick={() => setViewTask(null)} />
            </div>
            
            <div className="flex gap-2 mb-4">
              <span className="bg" style={{ background: `${PRIORITIES[viewTask.priority]}20`, color: PRIORITIES[viewTask.priority] }}>{PRIORITY_LABELS[viewTask.priority]}</span>
              <span className="bg" style={{ background: `${STATUS_COLORS[viewTask.status]}20`, color: STATUS_COLORS[viewTask.status] }}>{STATUS_LABELS[viewTask.status]}</span>
              <span className="bg" style={{ background: 'var(--hv)' }}>{viewTask.department}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div><span style={{ color: 'var(--tx2)' }}>التاريخ:</span> {viewTask.date}</div>
              <div><span style={{ color: 'var(--tx2)' }}>الوقت:</span> {viewTask.time}</div>
              <div><span style={{ color: 'var(--tx2)' }}>المنشئ:</span> {getUserInfo(viewTask.cr)?.name}</div>
            </div>

            <div className="mb-4">
              <span className="text-sm" style={{ color: 'var(--tx2)' }}>الوصف:</span>
              <p className="text-sm mt-1 p-3 rounded-lg bg-[#111] whitespace-pre-wrap">{viewTask.description || 'لا يوجد'}</p>
            </div>

            {viewTask.assigneesUids?.length > 0 && (
              <div className="mb-3">
                <span className="text-sm" style={{ color: 'var(--tx2)' }}>المسؤولون:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {viewTask.assigneesUids.map(uid => (
                    <span key={uid} className="bg" style={{ background: 'var(--hv)' }}>{getUserInfo(uid)?.name || 'مجهول'}</span>
                  ))}
                </div>
              </div>
            )}

            {viewTask.files?.length > 0 && (
              <div className="mb-4">
                <span className="text-sm" style={{ color: 'var(--tx2)' }}>المرفقات:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {viewTask.files.map((f, i) => (
                    <span key={i} className="fc">
                      <FaFile style={{ color: '#A52A2A' }} /> {f.name}
                      <a href={f.url} download={f.name} className="ml-2 text-[#A52A2A]"><FaDownload /></a>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(userProfile?.primaryRole === 'chairman' || userProfile?.primaryRole === 'vp' || userProfile?.uid === viewTask.cr) && (
              <div className="flex gap-2 mt-6 pt-4 border-t border-[#1f1f1f]">
                <button onClick={() => { setViewTask(null); openModal(viewTask); }} className="bb flex items-center gap-1"><FaEdit /> تعديل</button>
                <button onClick={() => handleDeleteTask(viewTask.id)} className="cursor-pointer text-red-500 bg-red-500/10 px-4 py-2 rounded-lg font-bold flex items-center gap-1 border-none"><FaTrash /> حذف</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة إضافة/تعديل المهمة (Create/Edit Modal) */}
      {isModalOpen && (
        <div className="mo z-50">
          <div className="mc fi p-6 relative w-full max-w-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{editTaskId ? 'تعديل المهمة' : 'مهمة تشغيلية جديدة'}</h3>
              <FaTimes className="cursor-pointer text-gray-500 hover:text-white" onClick={() => setIsModalOpen(false)} />
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-2" style={{ maxHeight: '60vh' }}>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>العنوان</label>
                <input className="ip" value={title} onChange={e => setTitle(e.target.value)} placeholder="اكتب عنوان المهمة..." />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>التاريخ</label>
                  <input type="date" className="ip" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>الوقت</label>
                  <input type="time" className="ip" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>الأولوية</label>
                  <select className="ip" value={priority} onChange={e => setPriority(e.target.value as any)}>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="low">منخفضة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>الحالة</label>
                  <select className="ip" value={status} onChange={e => setStatus(e.target.value as any)}>
                    <option value="todo">لم تبدأ</option>
                    <option value="progress">جارية</option>
                    <option value="done">مكتملة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>الوصف والتفاصيل</label>
                <textarea className="ip" rows={3} value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>

              {/* قسم المسؤولين (Assignees) */}
              <div className="relative">
                <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>المسؤولون عن التنفيذ</label>
                <div className="p-2 min-h-[40px] bg-[#111] border border-[#1f1f1f] rounded-lg flex flex-wrap gap-2 items-center">
                  {assignees.map(uid => (
                    <span key={uid} className="fc">
                      {getUserInfo(uid)?.name || 'مجهول'}
                      <FaTimes className="cursor-pointer ml-1 text-gray-400 hover:text-red-500" onClick={() => setAssignees(assignees.filter(id => id !== uid))} />
                    </span>
                  ))}
                  <input 
                    className="bg-transparent border-none outline-none text-sm flex-1 min-w-[120px] text-white" 
                    placeholder="ابحث بالاسم..." 
                    value={assigneeQuery} 
                    onChange={e => { setAssigneeQuery(e.target.value); setShowAssigneeDrop(true); }}
                    onFocus={() => setShowAssigneeDrop(true)}
                  />
                </div>
                {showAssigneeDrop && assigneeQuery && (
                  <div className="md absolute w-full mt-1 z-10">
                    {users.filter(u => u.name.includes(assigneeQuery) && !assignees.includes(u.uid)).map(u => (
                      <div key={u.uid} className="mi" onMouseDown={() => { setAssignees([...assignees, u.uid]); setAssigneeQuery(''); setShowAssigneeDrop(false); }}>
                        <FaUser className="text-[#3B82F6]" /> {u.name} ({u.department})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* قسم المرفقات */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>مرفقات المهمة</label>
                <label className="block border-2 border-dashed border-[#1f1f1f] rounded-lg p-4 text-center cursor-pointer hover:border-[#8B1A1A] transition-colors">
                  <FaCloudUploadAlt className="text-2xl mx-auto mb-2 text-gray-500" />
                  <span className="text-xs text-gray-500">اضغط لرفع ملف (الحد الأقصى 5 ميجا)</span>
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, i) => (
                    <span key={i} className="fc text-xs">
                      <FaFile className="text-[#A52A2A]" /> {f.name}
                      <FaTimes className="cursor-pointer ml-1 text-gray-400 hover:text-red-500" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} />
                    </span>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-[#1f1f1f]">
              <button type="button" onClick={handleSaveTask} className="bb flex-1 flex justify-center items-center gap-2"><FaSave /> حفظ المهمة</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg text-sm bg-[#111] text-gray-300 hover:bg-[#222]">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};