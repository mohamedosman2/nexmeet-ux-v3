import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import { db, storage, uploadFile, deleteFile } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  orderBy,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import toast from 'react-hot-toast';
import { 
  FaPlus, 
  FaSearch, 
  FaFilter, 
  FaTimes, 
  FaEdit, 
  FaTrash, 
  FaEye,
  FaCheck,
  FaClock,
  FaCalendarAlt,
  FaBuilding,
  FaUser,
  FaPaperclip,
  FaDownload,
  FaUpload,
  FaComment,
  FaBell,
  FaStar,
  FaRegStar,
  FaChartLine,
  FaSortAmountDown,
  FaSortAmountUp,
  FaThLarge,
  FaList,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaUserPlus,
  FaTag,
  FaLink,
  FaImage,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileArchive,
  FaFileCode,
  FaFileAlt,
  FaTasks
} from 'react-icons/fa';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// ==========================================
// الأنواع
// ==========================================

type Priority = 'high' | 'medium' | 'low';
type TaskStatus = 'todo' | 'progress' | 'done';
type ViewMode = 'list' | 'grid';
type SortBy = 'date' | 'priority' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface Attachment {
  name: string;
  type: string;
  url: string;
  size?: number;
  uploadedAt: number;
}

interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  department: string;
  createdByUid: string;
  assigneesUids: string[];
  mentionsUids: string[];
  attachments: Attachment[];
  comments: Comment[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

interface Comment {
  id: string;
  text: string;
  createdByUid: string;
  createdAt: number;
  attachments?: Attachment[];
}

interface User {
  uid: string;
  name: string;
  email: string;
  department: string;
  avatarUrl?: string;
}

// ==========================================
// الثوابت
// ==========================================

const PRIORITIES: Record<Priority, { label: string; color: string; icon: JSX.Element }> = {
  high: { label: 'عالية', color: '#EF4444', icon: <FaExclamationTriangle /> },
  medium: { label: 'متوسطة', color: '#F59E0B', icon: <FaClock /> },
  low: { label: 'منخفضة', color: '#22C55E', icon: <FaCheckCircle /> }
};

const STATUSES: Record<TaskStatus, { label: string; color: string; icon: JSX.Element }> = {
  todo: { label: 'لم تبدأ', color: '#6B7280', icon: <FaSpinner /> },
  progress: { label: 'جارية', color: '#3B82F6', icon: <FaClock /> },
  done: { label: 'مكتملة', color: '#22C55E', icon: <FaCheckCircle /> }
};

const DEPARTMENTS = [
  'التسويق',
  'المالية والتدقيق',
  'الموارد البشرية',
  'التكنولوجيا',
  'العلاقات العامة',
  'الإدارة العليا'
];

// ==========================================
// صفحة المهام الرئيسية
// ==========================================

export const TasksPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { isTopManagement, isManager } = usePermissions();
  
  // ==========================================
  // حالات البيانات
  // ==========================================
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ==========================================
  // حالات الفلترة
  // ==========================================
  
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // ==========================================
  // حالات العرض والترتيب
  // ==========================================
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // ==========================================
  // حالات النوافذ المنبثقة
  // ==========================================
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  
  // ==========================================
  // حالات النموذج
  // ==========================================
  
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [department, setDepartment] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  
  // ==========================================
  // حالات المرفقات
  // ==========================================
  
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ==========================================
  // حالات البحث عن المستخدمين
  // ==========================================
  
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  
  // ==========================================
  // حالات التعليقات
  // ==========================================
  
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  
  // ==========================================
  // جلب المستخدمين
  // ==========================================
  
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(fetchedUsers);
    });
    return unsubscribe;
  }, []);
  
  // ==========================================
  // جلب المهام مع صلاحيات المستخدم
  // ==========================================
  
  useEffect(() => {
    if (!userProfile) return;
    
    let tasksQuery;
    
    if (isTopManagement) {
      // الإدارة العليا ترى كل المهام
      tasksQuery = query(collection(db, 'tasks'), orderBy('date', 'asc'));
    } else if (isManager) {
      // المدير يرى مهام إدارته والمهام المخصصة له
      tasksQuery = query(
        collection(db, 'tasks'),
        where('department', '==', userProfile.department),
        orderBy('date', 'asc')
      );
    } else {
      // الموظف العادي يرى المهام المخصصة له فقط
      tasksQuery = query(
        collection(db, 'tasks'),
        where('assigneesUids', 'array-contains', userProfile.uid),
        orderBy('date', 'asc')
      );
    }
    
    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const fetchedTasks: Task[] = [];
      snapshot.forEach((doc) => {
        const task = { id: doc.id, ...doc.data() } as Task;
        
        // فلترة إضافية للموظف العادي (المهام التي تم منشن فيها)
        if (!isTopManagement && !isManager) {
          const isMentioned = task.mentionsUids?.includes(userProfile.uid);
          const isCreatedByMe = task.createdByUid === userProfile.uid;
          if (!isMentioned && !isCreatedByMe && !task.assigneesUids?.includes(userProfile.uid)) {
            return;
          }
        }
        
        fetchedTasks.push(task);
      });
      setTasks(fetchedTasks);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching tasks:', error);
      toast.error('حدث خطأ في جلب المهام');
      setLoading(false);
    });
    
    return unsubscribe;
  }, [userProfile, isTopManagement, isManager]);
  
  // ==========================================
  // جلب التعليقات عند عرض مهمة
  // ==========================================
  
  useEffect(() => {
    if (!viewingTask) return;
    setCommentsList(viewingTask.comments || []);
  }, [viewingTask]);
  
  // ==========================================
  // دوال الفلترة والبحث
  // ==========================================
  
  const filteredTasks = useCallback(() => {
    let filtered = [...tasks];
    
    // البحث
    if (searchQuery) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // فلترة حسب الأولوية
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }
    
    // فلترة حسب الحالة
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    
    // فلترة حسب الإدارة
    if (filterDepartment !== 'all') {
      filtered = filtered.filter(task => task.department === filterDepartment);
    }
    
    // فلترة حسب المسؤول
    if (filterAssignee !== 'all') {
      filtered = filtered.filter(task => task.assigneesUids?.includes(filterAssignee));
    }
    
    // الترتيب
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          break;
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'status':
          const statusOrder = { todo: 0, progress: 1, done: 2 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'createdAt':
          comparison = a.createdAt - b.createdAt;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [tasks, searchQuery, filterPriority, filterStatus, filterDepartment, filterAssignee, sortBy, sortOrder]);
  
  // ==========================================
  // إحصائيات المهام
  // ==========================================
  
  const tasksStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    progress: tasks.filter(t => t.status === 'progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    high: tasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
    overdue: tasks.filter(t => t.date < new Date().toISOString().split('T')[0] && t.status !== 'done').length
  };
  
  // ==========================================
  // فتح نافذة إنشاء مهمة جديدة
  // ==========================================
  
  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('09:00');
    setDescription('');
    setPriority('medium');
    setStatus('todo');
    setDepartment(userProfile?.department || DEPARTMENTS[0]);
    setAssignees([]);
    setMentions([]);
    setAttachments([]);
    setIsPublic(true);
    setShowTaskModal(true);
  };
  
  // ==========================================
  // فتح نافذة تعديل مهمة
  // ==========================================
  
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDate(task.date);
    setTime(task.time);
    setDescription(task.description || '');
    setPriority(task.priority);
    setStatus(task.status);
    setDepartment(task.department);
    setAssignees(task.assigneesUids || []);
    setMentions(task.mentionsUids || []);
    setAttachments(task.attachments || []);
    setIsPublic(task.isPublic);
    setShowTaskModal(true);
  };
  
  // ==========================================
  // حفظ المهمة (إضافة أو تعديل)
  // ==========================================
  
  const handleSaveTask = async () => {
    if (!title || !date || !time) {
      toast.error('يرجى ملء الحقول الأساسية');
      return;
    }
    
    if (!userProfile) return;
    
    const taskData = {
      title,
      date,
      time,
      description,
      priority,
      status,
      department,
      createdByUid: userProfile.uid,
      assigneesUids: assignees,
      mentionsUids: mentions,
      attachments,
      isPublic,
      updatedAt: Date.now()
    };
    
    try {
      if (editingTask) {
        // تحديث مهمة موجودة
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
        toast.success('تم تحديث المهمة بنجاح');
      } else {
        // إنشاء مهمة جديدة
        const newTask = {
          ...taskData,
          createdAt: Date.now(),
          comments: []
        };
        const docRef = await addDoc(collection(db, 'tasks'), newTask);
        toast.success('تم إنشاء المهمة بنجاح');
        
        // إرسال إشعارات للمعنيين
        const notifyUsers = [...new Set([...assignees, ...mentions])];
        for (const uid of notifyUsers) {
          if (uid !== userProfile.uid) {
            await addDoc(collection(db, 'notifications'), {
              targetUid: uid,
              title: 'مهمة جديدة',
              message: `تم إضافة مهمة جديدة "${title}" تهمك`,
              type: 'task',
              relatedId: docRef.id,
              isRead: false,
              createdAt: Date.now()
            });
          }
        }
      }
      
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('حدث خطأ في حفظ المهمة');
    }
  };
  
  // ==========================================
  // حذف مهمة
  // ==========================================
  
  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;
    
    try {
      // حذف المرفقات من التخزين
      const task = tasks.find(t => t.id === deletingTaskId);
      if (task?.attachments) {
        for (const attachment of task.attachments) {
          try {
            await deleteFile(attachment.url);
          } catch (e) {
            console.warn('Could not delete file:', e);
          }
        }
      }
      
      await deleteDoc(doc(db, 'tasks', deletingTaskId));
      toast.success('تم حذف المهمة بنجاح');
      setShowDeleteConfirm(false);
      setDeletingTaskId(null);
      setViewingTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('حدث خطأ في حذف المهمة');
    }
  };
  
  // ==========================================
  // تحديث حالة المهمة
  // ==========================================
  
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { 
        status: newStatus,
        completedAt: newStatus === 'done' ? Date.now() : null,
        updatedAt: Date.now()
      });
      toast.success(`تم تغيير الحالة إلى ${STATUSES[newStatus].label}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('حدث خطأ في تحديث الحالة');
    }
  };
  
  // ==========================================
  // رفع المرفقات
  // ==========================================
  
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const uploadedFiles: Attachment[] = [];
    
    for (const file of fileArray) {
      // التحقق من حجم الملف (حد أقصى 10 ميجابايت)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`الملف ${file.name} كبير جداً (حد أقصى 10 ميجابايت)`);
        continue;
      }
      
      // إضافة ملف قيد الرفع
      const uploadingFile = { name: file.name, progress: 0 };
      setUploadingFiles(prev => [...prev, uploadingFile]);
      
      try {
        // رفع الملف إلى Firebase Storage
        const path = `tasks/${Date.now()}_${file.name}`;
        const downloadURL = await uploadFile(path, file, (progress) => {
          setUploadingFiles(prev => 
            prev.map(f => f.name === file.name ? { ...f, progress } : f)
          );
        });
        
        uploadedFiles.push({
          name: file.name,
          type: file.type,
          url: downloadURL,
          size: file.size,
          uploadedAt: Date.now()
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`فشل رفع الملف ${file.name}`);
      } finally {
        setUploadingFiles(prev => prev.filter(f => f.name !== file.name));
      }
    }
    
    setAttachments(prev => [...prev, ...uploadedFiles]);
  };
  
  // ==========================================
  // إزالة مرفق
  // ==========================================
  
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // ==========================================
  // دوال المستخدمين (المسؤولين والمنشنات)
  // ==========================================
  
  const getAvailableUsers = (excludeIds: string[] = []) => {
    return users.filter(u => 
      u.uid !== userProfile?.uid && 
      !excludeIds.includes(u.uid) &&
      (isTopManagement || u.department === userProfile?.department)
    );
  };
  
  const getUserName = (uid: string) => {
    const user = users.find(u => u.uid === uid);
    return user?.name || 'مستخدم غير معروف';
  };
  
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };
  
  const handleAddAssignee = (uid: string) => {
    if (!assignees.includes(uid)) {
      setAssignees([...assignees, uid]);
    }
    setAssigneeSearch('');
    setShowAssigneeDropdown(false);
  };
  
  const handleRemoveAssignee = (uid: string) => {
    setAssignees(assignees.filter(id => id !== uid));
  };
  
  const handleAddMention = (uid: string) => {
    if (!mentions.includes(uid)) {
      setMentions([...mentions, uid]);
    }
    setMentionSearch('');
    setShowMentionDropdown(false);
  };
  
  const handleRemoveMention = (uid: string) => {
    setMentions(mentions.filter(id => id !== uid));
  };
  
  // ==========================================
  // دوال التعليقات
  // ==========================================
  
  const handleAddComment = async () => {
    if (!newComment.trim() || !viewingTask) return;
    
    setAddingComment(true);
    try {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        createdByUid: userProfile?.uid || '',
        createdAt: Date.now()
      };
      
      const updatedComments = [...(viewingTask.comments || []), comment];
      await updateDoc(doc(db, 'tasks', viewingTask.id), { comments: updatedComments });
      
      setNewComment('');
      setViewingTask({ ...viewingTask, comments: updatedComments });
      setCommentsList(updatedComments);
      toast.success('تم إضافة التعليق');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('حدث خطأ في إضافة التعليق');
    } finally {
      setAddingComment(false);
    }
  };
  
  // ==========================================
  // دوال مساعدة
  // ==========================================
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'dd MMMM yyyy', { locale: arSA });
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FaImage />;
    if (fileType === 'application/pdf') return <FaFilePdf />;
    if (fileType.includes('word')) return <FaFileWord />;
    if (fileType.includes('excel')) return <FaFileExcel />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <FaFileArchive />;
    if (fileType.includes('json') || fileType.includes('javascript') || fileType.includes('html')) return <FaFileCode />;
    return <FaFileAlt />;
  };
  
  // ==========================================
  // عرض بطاقة المهمة (عرض الشبكة)
  // ==========================================
  
  const TaskGridCard: React.FC<{ task: Task }> = ({ task }) => {
    const assigneesList = task.assigneesUids?.slice(0, 3) || [];
    const remainingCount = (task.assigneesUids?.length || 0) - 3;
    const isOverdue = task.date < new Date().toISOString().split('T')[0] && task.status !== 'done';
    
    return (
      <div 
        className={`card cursor-pointer hover:translate-y-0 transition-all group ${isOverdue ? 'border-red-500/30' : ''}`}
        onClick={() => setViewingTask(task)}
      >
        {/* رأس البطاقة */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: PRIORITIES[task.priority].color }} />
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ 
              background: `${STATUSES[task.status].color}20`,
              color: STATUSES[task.status].color
            }}>
              {STATUSES[task.status].label}
            </span>
            {isOverdue && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-500/20 text-red-500">
                متأخرة
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
              className="p-1 rounded hover:bg-hv transition-colors"
            >
              <FaEdit size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeletingTaskId(task.id); setShowDeleteConfirm(true); }}
              className="p-1 rounded hover:bg-red-500/10 transition-colors text-red-500"
            >
              <FaTrash size={12} />
            </button>
          </div>
        </div>
        
        {/* العنوان */}
        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{task.title}</h3>
        
        {/* الوصف المختصر */}
        {task.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
        )}
        
        {/* التاريخ والوقت */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <FaCalendarAlt /> {formatDate(task.date)}
          </span>
          <span className="flex items-center gap-1">
            <FaClock /> {task.time}
          </span>
        </div>
        
        {/* الإدارة */}
        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-3">
          <FaBuilding />
          <span>{task.department}</span>
        </div>
        
        {/* المسؤولون */}
        {assigneesList.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
              {assigneesList.map(uid => {
                const userName = getUserName(uid);
                return (
                  <div
                    key={uid}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-bg3"
                    style={{ background: 'var(--brand-primary)' }}
                    title={userName}
                  >
                    {getUserInitials(userName)}
                  </div>
                );
              })}
              {remainingCount > 0 && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-bg3" style={{ background: 'var(--hv)' }}>
                  +{remainingCount}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // ==========================================
  // عرض صف المهمة (عرض القائمة)
  // ==========================================
  
  const TaskListItem: React.FC<{ task: Task }> = ({ task }) => {
    const isOverdue = task.date < new Date().toISOString().split('T')[0] && task.status !== 'done';
    
    return (
      <div 
        className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all hover:bg-hv group ${isOverdue ? 'bg-red-500/5' : ''}`}
        onClick={() => setViewingTask(task)}
      >
        {/* حالة المهمة */}
        <div className="flex-shrink-0">
          <select
            value={task.status}
            onChange={(e) => {
              e.stopPropagation();
              handleUpdateStatus(task.id, e.target.value as TaskStatus);
            }}
            className="text-xs px-2 py-1 rounded border-none cursor-pointer"
            style={{ 
              background: `${STATUSES[task.status].color}20`,
              color: STATUSES[task.status].color
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="todo">لم تبدأ</option>
            <option value="progress">جارية</option>
            <option value="done">مكتملة</option>
          </select>
        </div>
        
        {/* الأولوية */}
        <div className="flex-shrink-0">
          <div className="w-2 h-2 rounded-full" style={{ background: PRIORITIES[task.priority].color }} />
        </div>
        
        {/* العنوان */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{task.title}</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">{task.department}</p>
        </div>
        
        {/* التاريخ */}
        <div className="flex-shrink-0 text-xs text-gray-500">
          {formatDate(task.date)}
        </div>
        
        {/* الوقت */}
        <div className="flex-shrink-0 text-xs text-gray-500">
          {task.time}
        </div>
        
        {/* المسؤولون */}
        <div className="flex-shrink-0 flex -space-x-2">
          {(task.assigneesUids?.slice(0, 2) || []).map(uid => {
            const userName = getUserName(uid);
            return (
              <div
                key={uid}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-bg3"
                style={{ background: 'var(--brand-primary)' }}
                title={userName}
              >
                {getUserInitials(userName)}
              </div>
            );
          })}
          {(task.assigneesUids?.length || 0) > 2 && (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-bg3" style={{ background: 'var(--hv)' }}>
              +{(task.assigneesUids?.length || 0) - 2}
            </div>
          )}
        </div>
        
        {/* أزرار الإجراءات */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
            className="p-1.5 rounded hover:bg-hv transition-colors"
          >
            <FaEdit size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeletingTaskId(task.id); setShowDeleteConfirm(true); }}
            className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-red-500"
          >
            <FaTrash size={12} />
          </button>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // نافذة عرض تفاصيل المهمة
  // ==========================================
  
  const TaskViewModal: React.FC = () => {
    if (!viewingTask) return null;
    
    const isCreator = viewingTask.createdByUid === userProfile?.uid;
    const canEdit = isTopManagement || isManager || isCreator;
    const isOverdue = viewingTask.date < new Date().toISOString().split('T')[0] && viewingTask.status !== 'done';
    
    return (
      <div className="modal-overlay" onClick={() => setViewingTask(null)}>
        <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
          {/* الرأس */}
          <div className="modal-header">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold">{viewingTask.title}</h3>
              <span className="badge" style={{ background: `${PRIORITIES[viewingTask.priority].color}20`, color: PRIORITIES[viewingTask.priority].color }}>
                {PRIORITIES[viewingTask.priority].label}
              </span>
              <span className="badge" style={{ background: `${STATUSES[viewingTask.status].color}20`, color: STATUSES[viewingTask.status].color }}>
                {STATUSES[viewingTask.status].label}
              </span>
              {isOverdue && (
                <span className="badge badge-danger">متأخرة</span>
              )}
            </div>
            <button onClick={() => setViewingTask(null)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          {/* المحتوى */}
          <div className="modal-body space-y-4">
            {/* التاريخ والوقت */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <FaCalendarAlt className="text-gray-500" />
                <span>{formatDate(viewingTask.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FaClock className="text-gray-500" />
                <span>{viewingTask.time}</span>
              </div>
            </div>
            
            {/* الإدارة */}
            <div className="flex items-center gap-2 text-sm">
              <FaBuilding className="text-gray-500" />
              <span>{viewingTask.department}</span>
              {viewingTask.isPublic ? (
                <span className="badge badge-info text-[10px]">عام</span>
              ) : (
                <span className="badge badge-warning text-[10px]">خاص</span>
              )}
            </div>
            
            {/* الوصف */}
            {viewingTask.description && (
              <div>
                <label className="text-sm font-medium">الوصف</label>
                <div className="mt-1 p-3 rounded-lg whitespace-pre-wrap" style={{ background: 'var(--inp)' }}>
                  {viewingTask.description}
                </div>
              </div>
            )}
            
            {/* المسؤولون */}
            {viewingTask.assigneesUids && viewingTask.assigneesUids.length > 0 && (
              <div>
                <label className="text-sm font-medium">المسؤولون عن التنفيذ</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewingTask.assigneesUids.map(uid => (
                    <div key={uid} className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: 'var(--hv)' }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: 'var(--brand-primary)' }}>
                        {getUserInitials(getUserName(uid))}
                      </div>
                      <span className="text-xs">{getUserName(uid)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* المنشنات */}
            {viewingTask.mentionsUids && viewingTask.mentionsUids.length > 0 && (
              <div>
                <label className="text-sm font-medium">المنشنات</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewingTask.mentionsUids.map(uid => (
                    <div key={uid} className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                      <FaUser size={10} />
                      <span className="text-xs">{getUserName(uid)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* المرفقات */}
            {viewingTask.attachments && viewingTask.attachments.length > 0 && (
              <div>
                <label className="text-sm font-medium">المرفقات</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {viewingTask.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      download={att.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all hover:bg-hv"
                      style={{ background: 'var(--hv)' }}
                    >
                      {getFileIcon(att.type)}
                      <span>{att.name}</span>
                      <FaDownload size={10} />
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* التعليقات */}
            <div>
              <label className="text-sm font-medium">التعليقات ({commentsList.length})</label>
              <div className="mt-2 space-y-3 max-h-60 overflow-y-auto p-2 rounded-lg" style={{ background: 'var(--inp)' }}>
                {commentsList.length > 0 ? (
                  commentsList.map(comment => (
                    <div key={comment.id} className="p-2 rounded-lg" style={{ background: 'var(--bg3)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: 'var(--brand-secondary)' }}>
                          {getUserInitials(getUserName(comment.createdByUid))}
                        </div>
                        <span className="text-xs font-medium">{getUserName(comment.createdByUid)}</span>
                        <span className="text-[9px] text-gray-500">
                          {format(comment.createdAt, 'dd MMM yyyy, hh:mm a', { locale: arSA })}
                        </span>
                      </div>
                      <p className="text-xs mr-8">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-center text-gray-500 py-4">لا توجد تعليقات حتى الآن</p>
                )}
              </div>
              
              {/* إضافة تعليق جديد */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="أضف تعليقاً..."
                  className="input flex-1 text-sm"
                  disabled={addingComment}
                />
                <button
                  onClick={handleAddComment}
                  disabled={addingComment || !newComment.trim()}
                  className="btn-primary px-4"
                >
                  {addingComment ? <FaSpinner className="animate-spin" /> : <FaComment />}
                </button>
              </div>
            </div>
            
            {/* معلومات إضافية */}
            <div className="text-[10px] text-gray-500 pt-2 border-t" style={{ borderColor: 'var(--bd)' }}>
              <div>تم الإنشاء: {format(viewingTask.createdAt, 'dd MMM yyyy, hh:mm a', { locale: arSA })}</div>
              {viewingTask.updatedAt && viewingTask.updatedAt !== viewingTask.createdAt && (
                <div>آخر تحديث: {format(viewingTask.updatedAt, 'dd MMM yyyy, hh:mm a', { locale: arSA })}</div>
              )}
              <div>المنشئ: {getUserName(viewingTask.createdByUid)}</div>
            </div>
          </div>
          
          {/* أزرار الإجراءات */}
          <div className="modal-footer">
            <button onClick={() => setViewingTask(null)} className="btn-outline">
              إغلاق
            </button>
            {canEdit && (
              <>
                <button
                  onClick={() => {
                    setViewingTask(null);
                    openEditModal(viewingTask);
                  }}
                  className="btn-secondary"
                >
                  <FaEdit className="ml-2" /> تعديل
                </button>
                <button
                  onClick={() => {
                    setViewingTask(null);
                    setDeletingTaskId(viewingTask.id);
                    setShowDeleteConfirm(true);
                  }}
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
  // نافذة إضافة/تعديل مهمة
  // ==========================================
  
  const TaskFormModal: React.FC = () => {
    const availableUsers = getAvailableUsers([...assignees, ...mentions]);
    
    return (
      <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
        <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-lg font-bold">
              {editingTask ? 'تعديل المهمة' : 'مهمة جديدة'}
            </h3>
            <button onClick={() => setShowTaskModal(false)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body space-y-4">
            {/* عنوان المهمة */}
            <div>
              <label className="block text-sm font-medium mb-1">عنوان المهمة *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="أدخل عنوان المهمة"
              />
            </div>
            
            {/* التاريخ والوقت */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">التاريخ *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الوقت *</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            
            {/* الأولوية والحالة */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">الأولوية</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="input"
                >
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الحالة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="input"
                >
                  <option value="todo">لم تبدأ</option>
                  <option value="progress">جارية</option>
                  <option value="done">مكتملة</option>
                </select>
              </div>
            </div>
            
            {/* الإدارة */}
            <div>
              <label className="block text-sm font-medium mb-1">الإدارة</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input"
                disabled={!isTopManagement && !isManager}
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {!isTopManagement && !isManager && (
                <p className="text-xs text-gray-500 mt-1">لا يمكن تغيير الإدارة</p>
              )}
            </div>
            
            {/* الوصف */}
            <div>
              <label className="block text-sm font-medium mb-1">الوصف</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea"
                rows={4}
                placeholder="أدخل وصف المهمة..."
              />
            </div>
            
            {/* المسؤولون */}
            <div>
              <label className="block text-sm font-medium mb-1">المسؤولون عن التنفيذ</label>
              <div className="relative">
                <div className="flex flex-wrap gap-2 p-2 rounded-lg min-h-[42px]" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
                  {assignees.map(uid => {
                    const user = users.find(u => u.uid === uid);
                    return (
                      <div key={uid} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'var(--hv)' }}>
                        <span>{user?.name || uid}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignee(uid)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    );
                  })}
                  <input
                    type="text"
                    value={assigneeSearch}
                    onChange={(e) => {
                      setAssigneeSearch(e.target.value);
                      setShowAssigneeDropdown(true);
                    }}
                    onFocus={() => setShowAssigneeDropdown(true)}
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[100px]"
                    placeholder="أضف مسؤولاً..."
                  />
                </div>
                
                {showAssigneeDropdown && availableUsers.filter(u => 
                  u.name.includes(assigneeSearch) && !assignees.includes(u.uid)
                ).length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg shadow-lg overflow-hidden" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)' }}>
                    {availableUsers
                      .filter(u => u.name.includes(assigneeSearch) && !assignees.includes(u.uid))
                      .map(user => (
                        <div
                          key={user.uid}
                          onClick={() => handleAddAssignee(user.uid)}
                          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-hv transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--brand-primary)' }}>
                            {getUserInitials(user.name)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.department}</div>
                          </div>
                          <FaUserPlus size={12} className="text-gray-500" />
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">سيتم إشعار المسؤولين عبر الإشعارات</p>
            </div>
            
            {/* المنشنات */}
            <div>
              <label className="block text-sm font-medium mb-1">منشنات (@)</label>
              <div className="relative">
                <div className="flex flex-wrap gap-2 p-2 rounded-lg min-h-[42px]" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
                  {mentions.map(uid => {
                    const user = users.find(u => u.uid === uid);
                    return (
                      <div key={uid} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                        <FaUser size={10} />
                        <span>{user?.name || uid}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMention(uid)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    );
                  })}
                  <input
                    type="text"
                    value={mentionSearch}
                    onChange={(e) => {
                      setMentionSearch(e.target.value);
                      setShowMentionDropdown(true);
                    }}
                    onFocus={() => setShowMentionDropdown(true)}
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[100px]"
                    placeholder="@ أضف منشن..."
                  />
                </div>
                
                {showMentionDropdown && availableUsers.filter(u => 
                  u.name.includes(mentionSearch) && !mentions.includes(u.uid)
                ).length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg shadow-lg overflow-hidden" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)' }}>
                    {availableUsers
                      .filter(u => u.name.includes(mentionSearch) && !mentions.includes(u.uid))
                      .map(user => (
                        <div
                          key={user.uid}
                          onClick={() => handleAddMention(user.uid)}
                          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-hv transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--brand-secondary)' }}>
                            {getUserInitials(user.name)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.department}</div>
                          </div>
                          <FaTag size={12} className="text-gray-500" />
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">سيتم إشعار الأشخاص الممنشنين عبر الإشعارات</p>
            </div>
            
            {/* المرفقات */}
            <div>
              <label className="block text-sm font-medium mb-1">المرفقات</label>
              <div
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all hover:border-brand"
                style={{ borderColor: 'var(--bd)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <FaUpload className="mx-auto mb-2 text-gray-500" size={20} />
                <p className="text-sm text-gray-500">اضغط لرفع ملفات</p>
                <p className="text-xs text-gray-500 mt-1">الحد الأقصى 10 ميجابايت لكل ملف</p>
              </div>
              
              {/* الملفات المرفوعة */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--hv)' }}>
                      <div className="flex items-center gap-2">
                        {getFileIcon(att.type)}
                        <span className="text-sm">{att.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-red-500 hover:text-red-600 transition-colors"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* الملفات قيد الرفع */}
              {uploadingFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadingFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--hv)' }}>
                      <FaSpinner className="animate-spin" />
                      <span className="flex-1 text-sm">{file.name}</span>
                      <span className="text-xs">{file.progress}%</span>
                      <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bd)' }}>
                        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${file.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* الخصوصية */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-brand focus:ring-brand"
              />
              <label htmlFor="isPublic" className="text-sm">مهمة عامة (يراها الجميع في الإدارة)</label>
            </div>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowTaskModal(false)} className="btn-outline">
              إلغاء
            </button>
            <button onClick={handleSaveTask} className="btn-primary">
              <FaCheck className="ml-2" /> {editingTask ? 'تحديث' : 'إنشاء'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // نافذة تأكيد الحذف
  // ==========================================
  
  const DeleteConfirmModal: React.FC = () => {
    if (!deletingTaskId) return null;
    
    const taskToDelete = tasks.find(t => t.id === deletingTaskId);
    
    return (
      <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
        <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-lg font-bold text-red-500">تأكيد الحذف</h3>
            <button onClick={() => setShowDeleteConfirm(false)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-500/10">
              <FaExclamationTriangle className="text-red-500 text-2xl" />
            </div>
            <p className="mb-2">هل أنت متأكد من حذف هذه المهمة؟</p>
            <p className="text-sm text-gray-500">{taskToDelete?.title}</p>
            <p className="text-xs text-gray-500 mt-4">لا يمكن التراجع عن هذا الإجراء</p>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline">
              إلغاء
            </button>
            <button onClick={handleDeleteTask} className="btn-danger">
              <FaTrash className="ml-2" /> حذف نهائي
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  const filteredTasksList = filteredTasks();
  
  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* ==========================================
           بطاقات الإحصائيات
      ========================================== */}
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => { setFilterStatus('all'); setFilterPriority('all'); }}>
          <p className="text-xs text-gray-500">إجمالي المهام</p>
          <p className="text-2xl font-bold">{tasksStats.total}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilterStatus('progress')}>
          <p className="text-xs text-gray-500">قيد التنفيذ</p>
          <p className="text-2xl font-bold text-blue-500">{tasksStats.progress}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilterStatus('done')}>
          <p className="text-xs text-gray-500">مكتملة</p>
          <p className="text-2xl font-bold text-green-500">{tasksStats.done}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilterPriority('high')}>
          <p className="text-xs text-gray-500">عالية الأولوية</p>
          <p className="text-2xl font-bold text-red-500">{tasksStats.high}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilterStatus('todo')}>
          <p className="text-xs text-gray-500">متأخرة</p>
          <p className="text-2xl font-bold text-orange-500">{tasksStats.overdue}</p>
        </div>
      </div>
      
      {/* ==========================================
           شريط التحكم
      ========================================== */}
      
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* شريط البحث */}
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المهام..."
            className="input pr-9"
          />
        </div>
        
        {/* أزرار التحكم */}
        <div className="flex items-center gap-2">
          {/* زر تبديل العرض */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bd)' }}>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 transition-all ${viewMode === 'list' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
            >
              <FaList />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 transition-all ${viewMode === 'grid' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
            >
              <FaThLarge />
            </button>
          </div>
          
          {/* زر الفلترة */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`icon-btn ${showFilters ? 'bg-brand text-white' : ''}`}
          >
            <FaFilter />
          </button>
          
          {/* زر الترتيب */}
          <div className="relative group">
            <button className="icon-btn">
              <FaSortAmountDown />
            </button>
            <div className="absolute top-full left-0 mt-1 w-40 rounded-lg shadow-lg overflow-hidden hidden group-hover:block z-10" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)' }}>
              <button
                onClick={() => { setSortBy('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                className="w-full px-3 py-2 text-right text-sm hover:bg-hv transition-colors"
              >
                حسب التاريخ {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => { setSortBy('priority'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                className="w-full px-3 py-2 text-right text-sm hover:bg-hv transition-colors"
              >
                حسب الأولوية {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => { setSortBy('status'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                className="w-full px-3 py-2 text-right text-sm hover:bg-hv transition-colors"
              >
                حسب الحالة {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
          
          {/* زر إضافة مهمة */}
          <button onClick={openCreateModal} className="btn-primary">
            <FaPlus className="ml-2" /> مهمة جديدة
          </button>
        </div>
      </div>
      
      {/* ==========================================
           لوحة الفلاتر
      ========================================== */}
      
      {showFilters && (
        <div className="card p-4 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">الأولوية:</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
                className="input text-sm py-1.5"
              >
                <option value="all">الكل</option>
                <option value="todo">لم تبدأ</option>
                <option value="progress">جارية</option>
                <option value="done">مكتملة</option>
              </select>
            </div>
            
            {(isTopManagement || isManager) && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">الإدارة:</span>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="input text-sm py-1.5"
                >
                  <option value="all">الكل</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}
            
            <button
              onClick={() => {
                setFilterPriority('all');
                setFilterStatus('all');
                setFilterDepartment('all');
                setFilterAssignee('all');
                setSearchQuery('');
              }}
              className="text-sm text-brand-light hover:text-brand transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      )}
      
      {/* ==========================================
           عرض المهام
      ========================================== */}
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : filteredTasksList.length === 0 ? (
        <div className="card text-center py-12">
          <FaTasks className="text-5xl mx-auto mb-4 text-gray-500" />
          <p className="text-gray-500">لا توجد مهام</p>
          <button onClick={openCreateModal} className="btn-primary mt-4">
            <FaPlus className="ml-2" /> إضافة مهمة جديدة
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasksList.map(task => (
            <TaskGridCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'var(--bd)' }}>
            {filteredTasksList.map(task => (
              <TaskListItem key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
      
      {/* ==========================================
           النوافذ المنبثقة
      ========================================== */}
      
      {showTaskModal && <TaskFormModal />}
      {viewingTask && <TaskViewModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
    </div>
  );
};

export default TasksPage;