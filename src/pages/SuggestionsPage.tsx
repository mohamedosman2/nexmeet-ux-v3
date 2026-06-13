import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  FaLightbulb, 
  FaComments, 
  FaStar, 
  FaStarHalfAlt, 
  FaRegStar,
  FaThumbsUp, 
  FaThumbsDown,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaEnvelope,
  FaUser,
  FaBuilding,
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaTrash,
  FaEdit,
  FaReply,
  FaCheck,
  FaTimes,
  FaChartLine,
  FaEye,
  FaPlus
} from 'react-icons/fa';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// ==========================================
// الأنواع
// ==========================================

type SuggestionType = 'suggestion' | 'complaint' | 'inquiry' | 'feedback';
type SuggestionStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'implemented';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: SuggestionType;
  status: SuggestionStatus;
  createdByUid: string;
  createdByName: string;
  createdByEmail: string;
  createdByDepartment: string;
  rating?: number;
  upvotes: number;
  downvotes: number;
  upvotedBy: string[];
  downvotedBy: string[];
  comments: Comment[];
  adminResponse?: string;
  adminResponseAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface Comment {
  id: string;
  text: string;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

interface User {
  uid: string;
  name: string;
  email: string;
  department: string;
  isActive: boolean;
}

// ==========================================
// الثوابت
// ==========================================

const suggestionTypes: { value: SuggestionType; label: string; icon: JSX.Element; color: string }[] = [
  { value: 'suggestion', label: 'اقتراح', icon: <FaLightbulb size={16} />, color: '#F59E0B' },
  { value: 'complaint', label: 'شكوى', icon: <FaComments size={16} />, color: '#EF4444' },
  { value: 'inquiry', label: 'استفسار', icon: <FaEnvelope size={16} />, color: '#3B82F6' },
  { value: 'feedback', label: 'تقييم', icon: <FaStar size={16} />, color: '#22C55E' }
];

const statusConfig: { value: SuggestionStatus; label: string; color: string; icon: JSX.Element }[] = [
  { value: 'pending', label: 'قيد المراجعة', color: '#F59E0B', icon: <FaSpinner size={12} /> },
  { value: 'reviewing', label: 'قيد الدراسة', color: '#3B82F6', icon: <FaEye size={12} /> },
  { value: 'approved', label: 'مقبول', color: '#22C55E', icon: <FaCheckCircle size={12} /> },
  { value: 'rejected', label: 'مرفوض', color: '#EF4444', icon: <FaTimesCircle size={12} /> },
  { value: 'implemented', label: 'تم التنفيذ', color: '#8B1A1A', icon: <FaCheck size={12} /> }
];

// ==========================================
// صفحة الاقتراحات والشكاوى
// ==========================================

export const SuggestionsPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  
  // ==========================================
  // حالات البيانات
  // ==========================================
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<SuggestionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<SuggestionStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingSuggestion, setViewingSuggestion] = useState<Suggestion | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [adminResponse, setAdminResponse] = useState('');
  const [showAdminResponseModal, setShowAdminResponseModal] = useState(false);
  const [selectedSuggestionForResponse, setSelectedSuggestionForResponse] = useState<Suggestion | null>(null);
  
  // ==========================================
  // حالات النموذج
  // ==========================================
  
  const [formType, setFormType] = useState<SuggestionType>('suggestion');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRating, setFormRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  
  // ==========================================
  // جلب البيانات من Firebase
  // ==========================================
  
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: User[] = [];
      snapshot.forEach((doc) => {
        fetchedUsers.push({ uid: doc.id, ...doc.data() } as User);
      });
      setUsers(fetchedUsers);
    });
    
    const unsubscribeSuggestions = onSnapshot(
      query(collection(db, 'suggestions'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const fetchedSuggestions: Suggestion[] = [];
        snapshot.forEach((doc) => {
          fetchedSuggestions.push({ id: doc.id, ...doc.data() } as Suggestion);
        });
        setSuggestions(fetchedSuggestions);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching suggestions:', error);
        setLoading(false);
      }
    );
    
    return () => {
      unsubscribeUsers();
      unsubscribeSuggestions();
    };
  }, []);
  
  // ==========================================
  // فلترة الاقتراحات
  // ==========================================
  
  const filteredSuggestions = suggestions.filter(suggestion => {
    if (searchQuery && !suggestion.title.toLowerCase().includes(searchQuery.toLowerCase()) && !suggestion.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterType !== 'all' && suggestion.type !== filterType) {
      return false;
    }
    if (filterStatus !== 'all' && suggestion.status !== filterStatus) {
      return false;
    }
    return true;
  });
  
  // ==========================================
  // إضافة اقتراح جديد
  // ==========================================
  
  const handleAddSuggestion = async () => {
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error('يرجى ملء عنوان ووصف الاقتراح');
      return;
    }
    
    if (!userProfile) {
      toast.error('يجب تسجيل الدخول لإضافة اقتراح');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const newSuggestion = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        type: formType,
        status: 'pending' as SuggestionStatus,
        createdByUid: currentUser!.uid,
        createdByName: userProfile.name,
        createdByEmail: userProfile.email,
        createdByDepartment: userProfile.department,
        rating: formType === 'feedback' ? formRating : undefined,
        upvotes: 0,
        downvotes: 0,
        upvotedBy: [],
        downvotedBy: [],
        comments: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await addDoc(collection(db, 'suggestions'), newSuggestion);
      
      toast.success('تم إرسال اقتراحك بنجاح! شكراً لك');
      
      setFormTitle('');
      setFormDescription('');
      setFormType('suggestion');
      setFormRating(0);
      setShowAddModal(false);
      
    } catch (error) {
      console.error('Error adding suggestion:', error);
      toast.error('حدث خطأ في إرسال الاقتراح');
    } finally {
      setSubmitting(false);
    }
  };
  
  // ==========================================
  // التصويت على اقتراح (أعجبني / لم يعجبني)
  // ==========================================
  
  const handleVote = async (suggestionId: string, voteType: 'upvote' | 'downvote') => {
    if (!currentUser) {
      toast.error('يجب تسجيل الدخول للتصويت');
      return;
    }
    
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    const isUpvoted = suggestion.upvotedBy.includes(currentUser.uid);
    const isDownvoted = suggestion.downvotedBy.includes(currentUser.uid);
    
    let newUpvotes = suggestion.upvotes;
    let newDownvotes = suggestion.downvotes;
    let newUpvotedBy = [...suggestion.upvotedBy];
    let newDownvotedBy = [...suggestion.downvotedBy];
    
    if (voteType === 'upvote') {
      if (isUpvoted) {
        newUpvotes--;
        newUpvotedBy = newUpvotedBy.filter(uid => uid !== currentUser.uid);
      } else {
        newUpvotes++;
        newUpvotedBy.push(currentUser.uid);
        if (isDownvoted) {
          newDownvotes--;
          newDownvotedBy = newDownvotedBy.filter(uid => uid !== currentUser.uid);
        }
      }
    } else {
      if (isDownvoted) {
        newDownvotes--;
        newDownvotedBy = newDownvotedBy.filter(uid => uid !== currentUser.uid);
      } else {
        newDownvotes++;
        newDownvotedBy.push(currentUser.uid);
        if (isUpvoted) {
          newUpvotes--;
          newUpvotedBy = newUpvotedBy.filter(uid => uid !== currentUser.uid);
        }
      }
    }
    
    try {
      await updateDoc(doc(db, 'suggestions', suggestionId), {
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        upvotedBy: newUpvotedBy,
        downvotedBy: newDownvotedBy
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('حدث خطأ في التصويت');
    }
  };
  
  // ==========================================
  // إضافة تعليق
  // ==========================================
  
  const handleAddComment = async () => {
    if (!commentText.trim() || !viewingSuggestion || !userProfile) return;
    
    const newComment: Comment = {
      id: Date.now().toString(),
      text: commentText.trim(),
      createdByUid: currentUser!.uid,
      createdByName: userProfile.name,
      createdAt: Date.now()
    };
    
    const updatedComments = [...(viewingSuggestion.comments || []), newComment];
    
    try {
      await updateDoc(doc(db, 'suggestions', viewingSuggestion.id), {
        comments: updatedComments,
        updatedAt: Date.now()
      });
      setCommentText('');
      setViewingSuggestion({ ...viewingSuggestion, comments: updatedComments });
      toast.success('تم إضافة تعليقك');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('حدث خطأ في إضافة التعليق');
    }
  };
  
  // ==========================================
  // إضافة رد إداري (للمديرين فقط)
  // ==========================================
  
  const handleAdminResponse = async () => {
    if (!adminResponse.trim() || !selectedSuggestionForResponse || !userProfile) return;
    
    try {
      await updateDoc(doc(db, 'suggestions', selectedSuggestionForResponse.id), {
        adminResponse: adminResponse.trim(),
        adminResponseAt: Date.now(),
        status: 'reviewing',
        updatedAt: Date.now()
      });
      toast.success('تم إضافة رد الإدارة');
      setAdminResponse('');
      setShowAdminResponseModal(false);
      setSelectedSuggestionForResponse(null);
    } catch (error) {
      console.error('Error adding admin response:', error);
      toast.error('حدث خطأ في إضافة الرد');
    }
  };
  
  // ==========================================
  // تحديث حالة الاقتراح (للمديرين فقط)
  // ==========================================
  
  const handleUpdateStatus = async (suggestionId: string, newStatus: SuggestionStatus) => {
    try {
      await updateDoc(doc(db, 'suggestions', suggestionId), {
        status: newStatus,
        updatedAt: Date.now()
      });
      toast.success(`تم تحديث الحالة إلى ${statusConfig.find(s => s.value === newStatus)?.label}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('حدث خطأ في تحديث الحالة');
    }
  };
  
  // ==========================================
  // حذف اقتراح (للمديرين فقط)
  // ==========================================
  
  const handleDeleteSuggestion = async (suggestionId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاقتراح؟')) return;
    
    try {
      await deleteDoc(doc(db, 'suggestions', suggestionId));
      toast.success('تم حذف الاقتراح');
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      toast.error('حدث خطأ في حذف الاقتراح');
    }
  };
  
  // ==========================================
  // الحصول على اسم المستخدم
  // ==========================================
  
  const getUserName = (uid: string) => {
    const user = users.find(u => u.uid === uid);
    return user?.name || 'مستخدم';
  };
  
  // ==========================================
  // تنسيق التاريخ
  // ==========================================
  
  const formatDate = (timestamp: number) => {
    return format(timestamp, 'dd MMMM yyyy، hh:mm a', { locale: arSA });
  };
  
  // ==========================================
  // حساب الوقت المنقضي
  // ==========================================
  
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} يوم`;
    return formatDate(timestamp);
  };
  
  // ==========================================
  // عرض نجوم التقييم
  // ==========================================
  
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<FaStar key={i} className="text-yellow-500" size={14} />);
      } else if (i - 0.5 <= rating) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-500" size={14} />);
      } else {
        stars.push(<FaRegStar key={i} className="text-gray-400" size={14} />);
      }
    }
    return stars;
  };
  
  // ==========================================
  // التحقق من صلاحيات المدير
  // ==========================================
  
  const isAdmin = userProfile?.primaryRole === 'chairman' || userProfile?.primaryRole === 'vp' || userProfile?.hasCustomAdminAccess === true;
  
  // ==========================================
  // نافذة إضافة اقتراح جديد
  // ==========================================
  
  const AddSuggestionModal: React.FC = () => (
    <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-bold">إضافة اقتراح جديد</h3>
          <button onClick={() => setShowAddModal(false)} className="icon-btn">
            <FaTimes />
          </button>
        </div>
        
        <div className="modal-body space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">نوع الاقتراح</label>
            <div className="flex flex-wrap gap-3">
              {suggestionTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormType(type.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    formType === type.value 
                      ? 'text-white' 
                      : 'text-gray-500 hover:bg-hv'
                  }`}
                  style={{ background: formType === type.value ? type.color : 'transparent' }}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">العنوان *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="input"
              placeholder="ملخص مختصر للاقتراح"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الوصف *</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="textarea"
              rows={5}
              placeholder="اشرح اقتراحك بالتفصيل..."
            />
          </div>
          
          {formType === 'feedback' && (
            <div>
              <label className="block text-sm font-medium mb-2">تقييمك</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="text-2xl focus:outline-none"
                  >
                    {star <= (hoverRating || formRating) ? (
                      <FaStar className="text-yellow-500" />
                    ) : (
                      <FaRegStar className="text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button onClick={() => setShowAddModal(false)} className="btn-outline">
            إلغاء
          </button>
          <button onClick={handleAddSuggestion} disabled={submitting} className="btn-primary">
            {submitting ? <FaSpinner className="animate-spin ml-2" /> : <FaLightbulb className="ml-2" />}
            إرسال الاقتراح
          </button>
        </div>
      </div>
    </div>
  );
  
  // ==========================================
  // نافذة عرض تفاصيل الاقتراح
  // ==========================================
  
  const SuggestionDetailModal: React.FC = () => {
    if (!viewingSuggestion) return null;
    
    const isCreator = viewingSuggestion.createdByUid === currentUser?.uid;
    const canManage = isAdmin || isCreator;
    
    return (
      <div className="modal-overlay" onClick={() => setViewingSuggestion(null)}>
        <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{viewingSuggestion.title}</h3>
              <span 
                className="badge"
                style={{ background: `${suggestionTypes.find(t => t.value === viewingSuggestion.type)?.color}20`, color: suggestionTypes.find(t => t.value === viewingSuggestion.type)?.color }}
              >
                {suggestionTypes.find(t => t.value === viewingSuggestion.type)?.icon}
                <span className="mr-1">{suggestionTypes.find(t => t.value === viewingSuggestion.type)?.label}</span>
              </span>
              <span 
                className="badge"
                style={{ background: `${statusConfig.find(s => s.value === viewingSuggestion.status)?.color}20`, color: statusConfig.find(s => s.value === viewingSuggestion.status)?.color }}
              >
                {statusConfig.find(s => s.value === viewingSuggestion.status)?.icon}
                <span className="mr-1">{statusConfig.find(s => s.value === viewingSuggestion.status)?.label}</span>
              </span>
            </div>
            <button onClick={() => setViewingSuggestion(null)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-hv">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--brand-primary)' }}>
                {viewingSuggestion.createdByName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{viewingSuggestion.createdByName}</p>
                <p className="text-xs text-gray-500">{viewingSuggestion.createdByDepartment}</p>
              </div>
              <div className="text-xs text-gray-500">
                {getTimeAgo(viewingSuggestion.createdAt)}
              </div>
            </div>
            
            {viewingSuggestion.rating && viewingSuggestion.rating > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">التقييم:</span>
                <div className="flex gap-0.5">
                  {renderStars(viewingSuggestion.rating)}
                </div>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium">الوصف</label>
              <div className="mt-1 p-3 rounded-lg bg-inp whitespace-pre-wrap">
                {viewingSuggestion.description}
              </div>
            </div>
            
            {viewingSuggestion.adminResponse && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(139,26,26,0.1)', borderRight: '3px solid var(--brand-primary)' }}>
                <p className="text-sm font-medium text-brand mb-1">رد الإدارة:</p>
                <p className="text-sm">{viewingSuggestion.adminResponse}</p>
                <p className="text-xs text-gray-500 mt-2">
                  تم الرد في {formatDate(viewingSuggestion.adminResponseAt!)}
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleVote(viewingSuggestion.id, 'upvote')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  viewingSuggestion.upvotedBy.includes(currentUser?.uid || '')
                    ? 'bg-green-500/20 text-green-500'
                    : 'hover:bg-hv'
                }`}
              >
                <FaThumbsUp size={14} />
                <span>{viewingSuggestion.upvotes}</span>
              </button>
              <button
                onClick={() => handleVote(viewingSuggestion.id, 'downvote')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  viewingSuggestion.downvotedBy.includes(currentUser?.uid || '')
                    ? 'bg-red-500/20 text-red-500'
                    : 'hover:bg-hv'
                }`}
              >
                <FaThumbsDown size={14} />
                <span>{viewingSuggestion.downvotes}</span>
              </button>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">التعليقات ({viewingSuggestion.comments?.length || 0})</label>
              <div className="space-y-3 max-h-60 overflow-y-auto p-2 rounded-lg bg-inp">
                {viewingSuggestion.comments && viewingSuggestion.comments.length > 0 ? (
                  viewingSuggestion.comments.map(comment => (
                    <div key={comment.id} className="p-2 rounded-lg bg-bg3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: 'var(--brand-secondary)' }}>
                          {comment.createdByName.charAt(0)}
                        </div>
                        <span className="text-xs font-medium">{comment.createdByName}</span>
                        <span className="text-[9px] text-gray-500">{getTimeAgo(comment.createdAt)}</span>
                      </div>
                      <p className="text-xs mr-8">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-center text-gray-500 py-4">لا توجد تعليقات حتى الآن</p>
                )}
              </div>
              
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="أضف تعليقاً..."
                  className="input flex-1 text-sm"
                />
                <button onClick={handleAddComment} className="btn-primary px-4">
                  <FaReply size={14} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setViewingSuggestion(null)} className="btn-outline">
              إغلاق
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setSelectedSuggestionForResponse(viewingSuggestion);
                    setAdminResponse(viewingSuggestion.adminResponse || '');
                    setShowAdminResponseModal(true);
                    setViewingSuggestion(null);
                  }}
                  className="btn-secondary"
                >
                  <FaReply className="ml-2" /> رد الإدارة
                </button>
                <select
                  value={viewingSuggestion.status}
                  onChange={(e) => handleUpdateStatus(viewingSuggestion.id, e.target.value as SuggestionStatus)}
                  className="input text-sm w-32"
                >
                  {statusConfig.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDeleteSuggestion(viewingSuggestion.id)}
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
  // نافذة رد الإدارة
  // ==========================================
  
  const AdminResponseModal: React.FC = () => (
    <div className="modal-overlay" onClick={() => setShowAdminResponseModal(false)}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-bold">رد الإدارة</h3>
          <button onClick={() => setShowAdminResponseModal(false)} className="icon-btn">
            <FaTimes />
          </button>
        </div>
        
        <div className="modal-body">
          <p className="text-sm text-gray-500 mb-3">
            الرد على: <span className="font-medium text-white">{selectedSuggestionForResponse?.title}</span>
          </p>
          <textarea
            value={adminResponse}
            onChange={(e) => setAdminResponse(e.target.value)}
            className="textarea"
            rows={5}
            placeholder="اكتب رد الإدارة هنا..."
          />
        </div>
        
        <div className="modal-footer">
          <button onClick={() => setShowAdminResponseModal(false)} className="btn-outline">
            إلغاء
          </button>
          <button onClick={handleAdminResponse} className="btn-primary">
            إرسال الرد
          </button>
        </div>
      </div>
    </div>
  );
  
  // ==========================================
  // إحصائيات
  // ==========================================
  
  const stats = {
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === 'pending').length,
    reviewing: suggestions.filter(s => s.status === 'reviewing').length,
    approved: suggestions.filter(s => s.status === 'approved').length,
    implemented: suggestions.filter(s => s.status === 'implemented').length,
    rejected: suggestions.filter(s => s.status === 'rejected').length,
    suggestion: suggestions.filter(s => s.type === 'suggestion').length,
    complaint: suggestions.filter(s => s.type === 'complaint').length,
    inquiry: suggestions.filter(s => s.type === 'inquiry').length,
    feedback: suggestions.filter(s => s.type === 'feedback').length
  };
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  return (
    <div className="space-y-6 animate-fadeIn">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaLightbulb className="text-brand" />
            الاقتراحات والشكاوى
          </h1>
          <p className="text-gray-500 text-sm mt-1">شاركنا رأيك لتحسين النظام</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <FaPlus className="ml-2" /> اقتراح جديد
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">الإجمالي</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilterStatus('pending')}>
          <p className="text-xs text-gray-500">قيد المراجعة</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilterStatus('approved')}>
          <p className="text-xs text-gray-500">مقبولة</p>
          <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
        </div>
        <div className="card p-3 text-center cursor-pointer hover:bg-hv transition-colors" onClick={() => setFilterStatus('implemented')}>
          <p className="text-xs text-gray-500">تم التنفيذ</p>
          <p className="text-2xl font-bold text-brand">{stats.implemented}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الاقتراحات..."
            className="input pr-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`icon-btn ${showFilters ? 'bg-brand text-white' : ''}`}>
            <FaFilter size={14} />
          </button>
        </div>
      </div>
      
      {showFilters && (
        <div className="card p-4 animate-fadeIn">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">النوع:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as SuggestionType | 'all')}
                className="input text-sm py-1.5"
              >
                <option value="all">الكل</option>
                {suggestionTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">الحالة:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as SuggestionStatus | 'all')}
                className="input text-sm py-1.5"
              >
                <option value="all">الكل</option>
                {statusConfig.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setFilterType('all');
                setFilterStatus('all');
                setSearchQuery('');
              }}
              className="text-sm text-brand-light hover:text-brand transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="card text-center py-12">
          <FaLightbulb className="text-5xl mx-auto mb-4 text-gray-500" />
          <p className="text-gray-500">لا توجد اقتراحات</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary mt-4">
            <FaPlus className="ml-2" /> أضف اقتراحك الأول
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSuggestions.map(suggestion => (
            <div key={suggestion.id} className="card cursor-pointer hover:border-brand transition-all" onClick={() => setViewingSuggestion(suggestion)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span 
                      className="badge"
                      style={{ background: `${suggestionTypes.find(t => t.value === suggestion.type)?.color}20`, color: suggestionTypes.find(t => t.value === suggestion.type)?.color }}
                    >
                      {suggestionTypes.find(t => t.value === suggestion.type)?.icon}
                      <span className="mr-1">{suggestionTypes.find(t => t.value === suggestion.type)?.label}</span>
                    </span>
                    <span 
                      className="badge"
                      style={{ background: `${statusConfig.find(s => s.value === suggestion.status)?.color}20`, color: statusConfig.find(s => s.value === suggestion.status)?.color }}
                    >
                      {statusConfig.find(s => s.value === suggestion.status)?.icon}
                      <span className="mr-1">{statusConfig.find(s => s.value === suggestion.status)?.label}</span>
                    </span>
                    {suggestion.rating && suggestion.rating > 0 && (
                      <div className="flex gap-0.5">
                        {renderStars(suggestion.rating)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-base mb-1">{suggestion.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{suggestion.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FaUser size={10} />
                      {suggestion.createdByName}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaBuilding size={10} />
                      {suggestion.createdByDepartment}
                    </span>
                    <span className="flex items-center gap-1">
                      <FaCalendarAlt size={10} />
                      {getTimeAgo(suggestion.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote(suggestion.id, 'upvote'); }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                        suggestion.upvotedBy.includes(currentUser?.uid || '')
                          ? 'bg-green-500/20 text-green-500'
                          : 'hover:bg-hv'
                      }`}
                    >
                      <FaThumbsUp size={12} />
                      <span>{suggestion.upvotes}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVote(suggestion.id, 'downvote'); }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                        suggestion.downvotedBy.includes(currentUser?.uid || '')
                          ? 'bg-red-500/20 text-red-500'
                          : 'hover:bg-hv'
                      }`}
                    >
                      <FaThumbsDown size={12} />
                      <span>{suggestion.downvotes}</span>
                    </button>
                  </div>
                  {suggestion.comments && suggestion.comments.length > 0 && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <FaComments size={10} />
                      {suggestion.comments.length} تعليق
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showAddModal && <AddSuggestionModal />}
      {viewingSuggestion && <SuggestionDetailModal />}
      {showAdminResponseModal && <AdminResponseModal />}
      
    </div>
  );
};

export default SuggestionsPage;