// src/pages/MeetingsPage.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, usePermissions } from '../contexts/AuthContext';
import { db } from '../config/firebase';
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
  getDoc
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  FaPlus, 
  FaSearch, 
  FaFilter, 
  FaTimes, 
  FaEdit, 
  FaTrash, 
  FaEye,
  FaVideo,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaBuilding,
  FaGlobe,
  FaExternalLinkAlt,
  FaBell,
  FaCopy,
  FaShare,
  FaDownload,
  FaPrint,
  FaCheckCircle,
  FaSpinner,
  FaUserPlus,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaWhatsapp,
  FaTelegram,
  FaLink,
  FaQrcode,
  FaMap,
  FaStreetView,
  FaParking,
  FaCoffee,
  FaWifi,
  FaMicrophone,
  FaChalkboard,
  FaProjectDiagram
} from 'react-icons/fa';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

// ==========================================
// الأنواع
// ==========================================

type MeetingType = 'online' | 'offline';
type MeetingPlatform = 'zoom' | 'meet' | 'teams' | 'webex' | 'custom';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  type: MeetingType;
  platform?: MeetingPlatform;
  customLink?: string;
  region?: string;
  branch?: string;
  room?: string;
  attendeesUids: string[];
  mentionsUids: string[];
  notes?: string;
  agenda?: string[];
  createdByUid: string;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
  meetingLink?: string;
  meetingId?: string;
  meetingPassword?: string;
  reminderSent: boolean;
  attachments?: Attachment[];
}

interface Attachment {
  name: string;
  type: string;
  url: string;
  size?: number;
}

interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  avatarUrl?: string;
}

interface Branch {
  id: string;
  name: string;
  rooms: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  amenities?: string[];
  image?: string;
}

interface Region {
  id: string;
  name: string;
  branches: Branch[];
}

// ==========================================
// بيانات الفروع والمناطق (بيانات حقيقية)
// ==========================================

const REGIONS_DATA: Region[] = [
  {
    id: 'central',
    name: 'المنطقة الوسطى',
    branches: [
      { 
        id: 'riyadh_1', 
        name: 'فرع الحمرا (اليرموك)', 
        rooms: ['القاعة الرئيسية', 'قاعة التدريب 1', 'قاعة التدريب 2', 'قاعة الاجتماعات التنفيذية'],
        address: 'طريق الملك عبدالعزيز، حي اليرموك، الرياض',
        latitude: 24.7136,
        longitude: 46.6753,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات', 'شاشة عرض', 'بوفيه مفتوح', 'غرفة استراحة'],
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c'
      },
      { 
        id: 'riyadh_2', 
        name: 'فرع الملك عبدالعزيز (الملك فهد)', 
        rooms: ['قاعة المديرين', 'قاعة المؤتمرات', 'قاعة العروض التقديمية'],
        address: 'طريق الملك فهد، حي الملك فهد، الرياض',
        latitude: 24.6746,
        longitude: 46.7069,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات', 'شاشة عرض', 'ترجمة فورية', 'تصوير'],
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2'
      },
      { 
        id: 'riyadh_3', 
        name: 'مركز الأعمال الرقمي', 
        rooms: ['قاعة ابتكار', 'استوديو تصوير', 'قاعة افتراضية'],
        address: 'حي العليا، الرياض',
        latitude: 24.6855,
        longitude: 46.6791,
        amenities: ['واي فاي فائق السرعة', 'معدات تصوير', 'واقع افتراضي', 'ذكاء اصطناعي'],
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2'
      }
    ]
  },
  {
    id: 'eastern',
    name: 'المنطقة الشرقية',
    branches: [
      { 
        id: 'dammam', 
        name: 'فرع الدمام', 
        rooms: ['قاعة الشرق', 'قاعة الخليج', 'قاعة الإبداع'],
        address: 'طريق الملك سعود، الدمام',
        latitude: 26.4207,
        longitude: 50.0888,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات', 'شاشة عرض', 'بوفيه'],
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c'
      },
      { 
        id: 'khobar', 
        name: 'فرع الخبر', 
        rooms: ['قاعة البحر', 'قاعة الأمواج', 'قاعة اللؤلؤ'],
        address: 'طريق الأمير تركي، الخبر',
        latitude: 26.2797,
        longitude: 50.2091,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات', 'شاشة عرض', 'إطلالة على البحر'],
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2'
      }
    ]
  },
  {
    id: 'western',
    name: 'المنطقة الغربية',
    branches: [
      { 
        id: 'jeddah', 
        name: 'فرع جدة', 
        rooms: ['قاعة البحر الأحمر', 'قاعة المؤتمرات', 'قاعة المرجان'],
        address: 'طريق الأندلس، جدة',
        latitude: 21.5433,
        longitude: 39.1728,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات', 'شاشة عرض', 'بوفيه مفتوح', 'كافيتيريا'],
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c'
      },
      { 
        id: 'makkah', 
        name: 'فرع مكة المكرمة', 
        rooms: ['قاعة الحرم', 'قاعة زمزم', 'قاعة الصفا'],
        address: 'طريق العزيزية، مكة المكرمة',
        latitude: 21.4225,
        longitude: 39.8262,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات', 'شاشة عرض', 'قرب الحرم'],
        image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482'
      }
    ]
  },
  {
    id: 'northern',
    name: 'المنطقة الشمالية',
    branches: [
      { 
        id: 'jauf', 
        name: 'فرع الجوف', 
        rooms: ['قاعة الجوف', 'قاعة الحدود', 'قاعة زهور'],
        address: 'طريق الملك عبدالعزيز، سكاكا',
        latitude: 29.9696,
        longitude: 40.1942,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات', 'شاشة عرض'],
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c'
      },
      { 
        id: 'arar', 
        name: 'فرع عرعر', 
        rooms: ['قاعة الشمال', 'قاعة الحدود الشمالية'],
        address: 'طريق الملك فهد، عرعر',
        latitude: 30.9834,
        longitude: 41.0156,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات'],
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2'
      }
    ]
  },
  {
    id: 'southern',
    name: 'المنطقة الجنوبية',
    branches: [
      { 
        id: 'abha', 
        name: 'فرع أبها', 
        rooms: ['قاعة السودة', 'قاعة أبيها', 'قاعة الضباب'],
        address: 'طريق الملك عبدالعزيز، أبها',
        latitude: 18.2164,
        longitude: 42.5053,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات', 'شاشة عرض', 'إطلالة جبلية'],
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c'
      },
      { 
        id: 'khamis', 
        name: 'فرع خميس مشيط', 
        rooms: ['قاعة العرين', 'قاعة الشفاء'],
        address: 'طريق الملك فيصل، خميس مشيط',
        latitude: 18.3057,
        longitude: 42.7358,
        amenities: ['موقف سيارات', 'واي فاي', 'ميكروفونات', 'شاشة عرض'],
        image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2'
      }
    ]
  }
];

// منصات الاجتماعات الافتراضية
const PLATFORMS: Record<MeetingPlatform, { name: string; icon: JSX.Element; color: string; defaultLink: string }> = {
  zoom: { 
    name: 'Zoom', 
    icon: <FaVideo />, 
    color: '#0B5CFF',
    defaultLink: 'https://zoom.us/join'
  },
  meet: { 
    name: 'Google Meet', 
    icon: <FaGlobe />, 
    color: '#0F9D58',
    defaultLink: 'https://meet.google.com'
  },
  teams: { 
    name: 'Microsoft Teams', 
    icon: <FaUsers />, 
    color: '#464EB8',
    defaultLink: 'https://teams.microsoft.com/l/meetup-join'
  },
  webex: { 
    name: 'Cisco Webex', 
    icon: <FaVideo />, 
    color: '#00A9E0',
    defaultLink: 'https://webex.com/join'
  },
  custom: { 
    name: 'رابط مخصص', 
    icon: <FaLink />, 
    color: '#8B1A1A',
    defaultLink: ''
  }
};

// ==========================================
// صفحة الاجتماعات الرئيسية
// ==========================================

export const MeetingsPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { isTopManagement, isManager } = usePermissions();
  
  // حالات البيانات
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // حالات الفلترة
  const [filterType, setFilterType] = useState<MeetingType | 'all'>('all');
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  
  // حالات النوافذ المنبثقة
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joiningMeeting, setJoiningMeeting] = useState<Meeting | null>(null);
  
  // حالات النموذج
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<MeetingType>('online');
  const [platform, setPlatform] = useState<MeetingPlatform>('zoom');
  const [customLink, setCustomLink] = useState('');
  const [region, setRegion] = useState(REGIONS_DATA[0].name);
  const [branch, setBranch] = useState(REGIONS_DATA[0].branches[0].id);
  const [room, setRoom] = useState(REGIONS_DATA[0].branches[0].rooms[0]);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [agenda, setAgenda] = useState<string[]>(['']);
  const [isPublic, setIsPublic] = useState(true);
  
  // حالات البحث عن المستخدمين
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showAttendeeDropdown, setShowAttendeeDropdown] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  
  // حالات الإشعارات
  const [sendingReminders, setSendingReminders] = useState(false);

  // ==========================================
  // جلب البيانات من Firebase
  // ==========================================
  
  // جلب المستخدمين
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
  
  // جلب الاجتماعات مع صلاحيات المستخدم
  useEffect(() => {
    if (!userProfile) return;
    
    let meetingsQuery;
    
    if (isTopManagement) {
      meetingsQuery = query(collection(db, 'meetings'), orderBy('date', 'asc'), orderBy('time', 'asc'));
    } else {
      meetingsQuery = query(
        collection(db, 'meetings'),
        where('attendeesUids', 'array-contains', userProfile.uid),
        orderBy('date', 'asc'),
        orderBy('time', 'asc')
      );
    }
    
    const unsubscribe = onSnapshot(meetingsQuery, (snapshot) => {
      const fetchedMeetings: Meeting[] = [];
      snapshot.forEach((doc) => {
        const meeting = { id: doc.id, ...doc.data() } as Meeting;
        
        // فلترة إضافية للموظف العادي
        if (!isTopManagement && !isManager) {
          const isMentioned = meeting.mentionsUids?.includes(userProfile.uid);
          const isCreatedByMe = meeting.createdByUid === userProfile.uid;
          if (!isMentioned && !isCreatedByMe) {
            return;
          }
        }
        
        fetchedMeetings.push(meeting);
      });
      setMeetings(fetchedMeetings);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching meetings:', error);
      toast.error('حدث خطأ في جلب الاجتماعات');
      setLoading(false);
    });
    
    return unsubscribe;
  }, [userProfile, isTopManagement, isManager]);
  
  // ==========================================
  // دوال الفلترة والبحث
  // ==========================================
  
  const filteredMeetings = useCallback(() => {
    let filtered = [...meetings];
    const today = new Date().toISOString().split('T')[0];
    
    // البحث
    if (searchQuery) {
      filtered = filtered.filter(meeting => 
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // فلترة حسب النوع
    if (filterType !== 'all') {
      filtered = filtered.filter(meeting => meeting.type === filterType);
    }
    
    // فلترة حسب التاريخ
    if (filterDate === 'today') {
      filtered = filtered.filter(meeting => meeting.date === today);
    } else if (filterDate === 'upcoming') {
      filtered = filtered.filter(meeting => meeting.date >= today);
    } else if (filterDate === 'past') {
      filtered = filtered.filter(meeting => meeting.date < today);
    }
    
    return filtered;
  }, [meetings, searchQuery, filterType, filterDate]);
  
  // ==========================================
  // دوال إدارة الاجتماعات
  // ==========================================
  
  const openCreateModal = () => {
    setEditingMeeting(null);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('10:00');
    setType('online');
    setPlatform('zoom');
    setCustomLink('');
    setRegion(REGIONS_DATA[0].name);
    setBranch(REGIONS_DATA[0].branches[0].id);
    setRoom(REGIONS_DATA[0].branches[0].rooms[0]);
    setAttendees([]);
    setMentions([]);
    setNotes('');
    setAgenda(['']);
    setIsPublic(true);
    setShowMeetingModal(true);
  };
  
  const openEditModal = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setTitle(meeting.title);
    setDate(meeting.date);
    setTime(meeting.time);
    setType(meeting.type);
    setPlatform(meeting.platform || 'zoom');
    setCustomLink(meeting.customLink || '');
    setRegion(meeting.region || REGIONS_DATA[0].name);
    setBranch(meeting.branch || REGIONS_DATA[0].branches[0].id);
    setRoom(meeting.room || REGIONS_DATA[0].branches[0].rooms[0]);
    setAttendees(meeting.attendeesUids || []);
    setMentions(meeting.mentionsUids || []);
    setNotes(meeting.notes || '');
    setAgenda(meeting.agenda || ['']);
    setIsPublic(meeting.isPublic);
    setShowMeetingModal(true);
  };
  
  const handleSaveMeeting = async () => {
    if (!title || !date || !time) {
      toast.error('يرجى ملء الحقول الأساسية');
      return;
    }
    
    if (!userProfile) return;
    
    // توليد رابط الاجتماع إذا كان عن بُعد
    let meetingLink = '';
    let meetingId = '';
    let meetingPassword = '';
    
    if (type === 'online') {
      if (platform === 'custom' && customLink) {
        meetingLink = customLink;
      } else if (PLATFORMS[platform]?.defaultLink) {
        meetingLink = PLATFORMS[platform].defaultLink;
        // توليد معرف اجتماع عشوائي
        meetingId = `meet-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        meetingPassword = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    }
    
    const meetingData = {
      title,
      date,
      time,
      type,
      platform: type === 'online' ? platform : null,
      customLink: type === 'online' && platform === 'custom' ? customLink : null,
      region: type === 'offline' ? region : null,
      branch: type === 'offline' ? branch : null,
      room: type === 'offline' ? room : null,
      attendeesUids: attendees,
      mentionsUids: mentions,
      notes,
      agenda: agenda.filter(a => a.trim()),
      createdByUid: userProfile.uid,
      isPublic,
      meetingLink,
      meetingId,
      meetingPassword,
      reminderSent: false,
      updatedAt: Date.now()
    };
    
    try {
      if (editingMeeting) {
        await updateDoc(doc(db, 'meetings', editingMeeting.id), meetingData);
        toast.success('تم تحديث الاجتماع بنجاح');
      } else {
        const docRef = await addDoc(collection(db, 'meetings'), {
          ...meetingData,
          createdAt: Date.now()
        });
        toast.success('تم إنشاء الاجتماع بنجاح');
        
        // إرسال إشعارات للمدعوين والممنشنين
        const notifyUsers = [...new Set([...attendees, ...mentions])];
        for (const uid of notifyUsers) {
          if (uid !== userProfile.uid) {
            await addDoc(collection(db, 'notifications'), {
              targetUid: uid,
              title: 'دعوة اجتماع',
              message: `تمت دعوتك لحضور اجتماع "${title}" في ${date} الساعة ${time}`,
              type: 'meeting',
              relatedId: docRef.id,
              isRead: false,
              createdAt: Date.now()
            });
          }
        }
        
        // إرسال إشعارات إضافية عن البريد الإلكتروني (ميزة إضافية)
        await sendEmailNotifications(notifyUsers, title, date, time, meetingLink);
      }
      
      setShowMeetingModal(false);
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast.error('حدث خطأ في حفظ الاجتماع');
    }
  };
  
  // إرسال إشعارات البريد الإلكتروني (محاكاة - يمكن تفعيلها مع Firebase Cloud Functions)
  const sendEmailNotifications = async (userIds: string[], meetingTitle: string, meetingDate: string, meetingTime: string, link: string) => {
    // في الإصدار الكامل، يمكن ربط هذا بـ Firebase Cloud Functions أو EmailJS
    console.log(`Sending email notifications for meeting "${meetingTitle}" to users:`, userIds);
  };
  
  const handleDeleteMeeting = async () => {
    if (!deletingMeetingId) return;
    
    try {
      await deleteDoc(doc(db, 'meetings', deletingMeetingId));
      toast.success('تم حذف الاجتماع بنجاح');
      setShowDeleteConfirm(false);
      setDeletingMeetingId(null);
      setViewingMeeting(null);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('حدث خطأ في حذف الاجتماع');
    }
  };
  
  const handleJoinMeeting = (meeting: Meeting) => {
    setJoiningMeeting(meeting);
    setShowJoinModal(true);
  };
  
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('تم نسخ الرابط');
  };
  
  const handleShareMeeting = async (meeting: Meeting) => {
    const shareText = `دعوة لحضور اجتماع: ${meeting.title}\nالتاريخ: ${meeting.date}\nالوقت: ${meeting.time}\n`;
    const shareUrl = meeting.meetingLink || '';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: meeting.title,
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      handleCopyLink(shareText + shareUrl);
    }
  };
  
  const handleSendReminders = async (meeting: Meeting) => {
    setSendingReminders(true);
    try {
      const notifyUsers = [...new Set([...meeting.attendeesUids, ...meeting.mentionsUids])];
      for (const uid of notifyUsers) {
        await addDoc(collection(db, 'notifications'), {
          targetUid: uid,
          title: `تذكير: ${meeting.title}`,
          message: `يبدأ الاجتماع بعد ساعة في ${meeting.time}`,
          type: 'meeting',
          relatedId: meeting.id,
          isRead: false,
          createdAt: Date.now()
        });
      }
      await updateDoc(doc(db, 'meetings', meeting.id), { reminderSent: true });
      toast.success(`تم إرسال التذكيرات إلى ${notifyUsers.length} شخص`);
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('حدث خطأ في إرسال التذكيرات');
    } finally {
      setSendingReminders(false);
    }
  };
  
  // ==========================================
  // دوال المستخدمين
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
  
  const handleAddAttendee = (uid: string) => {
    if (!attendees.includes(uid)) {
      setAttendees([...attendees, uid]);
    }
    setAttendeeSearch('');
    setShowAttendeeDropdown(false);
  };
  
  const handleRemoveAttendee = (uid: string) => {
    setAttendees(attendees.filter(id => id !== uid));
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
  // دوال الأجندة
  // ==========================================
  
  const handleAddAgendaItem = () => {
    setAgenda([...agenda, '']);
  };
  
  const handleRemoveAgendaItem = (index: number) => {
    setAgenda(agenda.filter((_, i) => i !== index));
  };
  
  const handleAgendaChange = (index: number, value: string) => {
    const newAgenda = [...agenda];
    newAgenda[index] = value;
    setAgenda(newAgenda);
  };
  
  // ==========================================
  // دوال الفروع والغرف
  // ==========================================
  
  const getCurrentRegion = () => {
    return REGIONS_DATA.find(r => r.name === region);
  };
  
  const getCurrentBranches = () => {
    const currentRegion = getCurrentRegion();
    return currentRegion?.branches || [];
  };
  
  const getCurrentBranch = () => {
    const branches = getCurrentBranches();
    return branches.find(b => b.id === branch);
  };
  
  const getCurrentRooms = () => {
    const currentBranch = getCurrentBranch();
    return currentBranch?.rooms || [];
  };
  
  const getBranchAmenities = () => {
    const currentBranch = getCurrentBranch();
    return currentBranch?.amenities || [];
  };
  
  // ==========================================
  // تنسيق التواريخ
  // ==========================================
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'dd MMMM yyyy', { locale: arSA });
  };
  
  const isMeetingToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };
  
  const isMeetingPast = (dateStr: string) => {
    return dateStr < new Date().toISOString().split('T')[0];
  };
  
  // ==========================================
  // عرض بطاقة الاجتماع (عرض الشبكة)
  // ==========================================
  
  const MeetingGridCard: React.FC<{ meeting: Meeting }> = ({ meeting }) => {
    const attendeesCount = meeting.attendeesUids?.length || 0;
    const isPast = isMeetingPast(meeting.date);
    const isToday = isMeetingToday(meeting.date);
    
    return (
      <div 
        className={`card cursor-pointer transition-all group hover:translate-y-0 ${isPast ? 'opacity-60' : ''}`}
        onClick={() => setViewingMeeting(meeting)}
      >
        {/* حالة الاجتماع */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${meeting.type === 'online' ? 'bg-green-500' : 'bg-blue-500'}`} />
            <span className={`text-xs px-2 py-0.5 rounded ${isToday ? 'bg-green-500/20 text-green-500' : isPast ? 'bg-gray-500/20 text-gray-500' : 'bg-brand/20 text-brand'}`}>
              {isToday ? 'اليوم' : isPast ? 'منتهي' : formatDate(meeting.date)}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); openEditModal(meeting); }}
              className="p-1 rounded hover:bg-hv transition-colors"
            >
              <FaEdit size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setDeletingMeetingId(meeting.id); setShowDeleteConfirm(true); }}
              className="p-1 rounded hover:bg-red-500/10 transition-colors text-red-500"
            >
              <FaTrash size={12} />
            </button>
          </div>
        </div>
        
        {/* العنوان */}
        <h3 className="font-semibold text-base mb-2 line-clamp-1">{meeting.title}</h3>
        
        {/* التاريخ والوقت */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-1">
            <FaCalendarAlt size={10} /> {meeting.date}
          </span>
          <span className="flex items-center gap-1">
            <FaClock size={10} /> {meeting.time}
          </span>
        </div>
        
        {/* النوع والموقع */}
        <div className="flex items-center gap-2 mb-3">
          {meeting.type === 'online' ? (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <FaVideo size={10} /> {PLATFORMS[meeting.platform as MeetingPlatform]?.name || 'عن بُعد'}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <FaMapMarkerAlt size={10} /> {meeting.region} - {meeting.room}
            </span>
          )}
        </div>
        
        {/* المشاركون */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {(meeting.attendeesUids?.slice(0, 3) || []).map(uid => {
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
            {attendeesCount > 3 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-bg3" style={{ background: 'var(--hv)' }}>
                +{attendeesCount - 3}
              </div>
            )}
          </div>
          
          {/* زر الانضمام (للاجتماعات النشطة) */}
          {meeting.type === 'online' && meeting.meetingLink && !isPast && (
            <button
              onClick={(e) => { e.stopPropagation(); handleJoinMeeting(meeting); }}
              className="text-xs text-brand-light hover:text-brand transition-colors"
            >
              انضمام
            </button>
          )}
        </div>
      </div>
    );
  };
  
  // ==========================================
  // عرض صف الاجتماع (عرض القائمة)
  // ==========================================
  
  const MeetingListItem: React.FC<{ meeting: Meeting }> = ({ meeting }) => {
    const isPast = isMeetingPast(meeting.date);
    const isToday = isMeetingToday(meeting.date);
    
    return (
      <div 
        className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all hover:bg-hv group ${isPast ? 'opacity-60' : ''}`}
        onClick={() => setViewingMeeting(meeting)}
      >
        {/* التاريخ */}
        <div className="flex-shrink-0 text-center min-w-[60px]">
          <div className={`text-lg font-bold ${isToday ? 'text-brand' : ''}`}>
            {new Date(meeting.date).getDate()}
          </div>
          <div className="text-[10px] text-gray-500">
            {format(new Date(meeting.date), 'MMM', { locale: arSA })}
          </div>
        </div>
        
        {/* الوقت */}
        <div className="flex-shrink-0 text-xs text-gray-500 min-w-[60px]">
          {meeting.time}
        </div>
        
        {/* النوع */}
        <div className="flex-shrink-0">
          {meeting.type === 'online' ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/10 text-green-500">
              <FaVideo size={14} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500">
              <FaMapMarkerAlt size={14} />
            </div>
          )}
        </div>
        
        {/* العنوان */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{meeting.title}</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {meeting.type === 'online' ? PLATFORMS[meeting.platform as MeetingPlatform]?.name : `${meeting.region} - ${meeting.room}`}
          </p>
        </div>
        
        {/* المشاركون */}
        <div className="flex-shrink-0 flex -space-x-2">
          {(meeting.attendeesUids?.slice(0, 2) || []).map(uid => {
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
          {(meeting.attendeesUids?.length || 0) > 2 && (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-bg3" style={{ background: 'var(--hv)' }}>
              +{(meeting.attendeesUids?.length || 0) - 2}
            </div>
          )}
        </div>
        
        {/* أزرار الإجراءات */}
        <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {meeting.type === 'online' && meeting.meetingLink && !isPast && (
            <button
              onClick={(e) => { e.stopPropagation(); handleJoinMeeting(meeting); }}
              className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
            >
              انضمام
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(meeting); }}
            className="p-1.5 rounded hover:bg-hv transition-colors"
          >
            <FaEdit size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeletingMeetingId(meeting.id); setShowDeleteConfirm(true); }}
            className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-red-500"
          >
            <FaTrash size={12} />
          </button>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // نافذة عرض تفاصيل الاجتماع
  // ==========================================
  
  const MeetingViewModal: React.FC = () => {
    if (!viewingMeeting) return null;
    
    const isCreator = viewingMeeting.createdByUid === userProfile?.uid;
    const canEdit = isTopManagement || isManager || isCreator;
    const isPast = isMeetingPast(viewingMeeting.date);
    const isToday = isMeetingToday(viewingMeeting.date);
    const currentBranch = getCurrentBranch();
    const branchAmenities = getBranchAmenities();
    
    return (
      <div className="modal-overlay" onClick={() => setViewingMeeting(null)}>
        <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
          {/* الرأس */}
          <div className="modal-header">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{viewingMeeting.title}</h3>
              <span className={`badge ${viewingMeeting.type === 'online' ? 'badge-success' : 'badge-info'}`}>
                {viewingMeeting.type === 'online' ? 'عن بُعد' : 'حضوري'}
              </span>
              {isToday && <span className="badge badge-warning">اليوم</span>}
              {isPast && <span className="badge badge-secondary">منتهي</span>}
            </div>
            <button onClick={() => setViewingMeeting(null)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          {/* المحتوى */}
          <div className="modal-body space-y-4">
            {/* التاريخ والوقت */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg" style={{ background: 'var(--inp)' }}>
              <div className="flex items-center gap-2 text-sm">
                <FaCalendarAlt className="text-gray-500" />
                <span>{formatDate(viewingMeeting.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FaClock className="text-gray-500" />
                <span>{viewingMeeting.time}</span>
              </div>
            </div>
            
            {/* الموقع أو الرابط */}
            {viewingMeeting.type === 'online' ? (
              <div className="p-3 rounded-lg" style={{ background: 'var(--brand-primary)/10', border: '1px solid var(--brand-primary)/20' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaVideo className="text-green-500" />
                    <span className="font-medium">منصة {PLATFORMS[viewingMeeting.platform as MeetingPlatform]?.name}</span>
                  </div>
                  {viewingMeeting.meetingLink && !isPast && (
                    <button
                      onClick={() => handleJoinMeeting(viewingMeeting)}
                      className="btn-primary py-1 px-3 text-sm"
                    >
                      <FaExternalLinkAlt className="ml-1" size={12} /> انضمام
                    </button>
                  )}
                </div>
                {viewingMeeting.meetingLink && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 text-xs p-2 rounded" style={{ background: 'var(--bg)', color: 'var(--tx2)' }}>
                      {viewingMeeting.meetingLink}
                    </code>
                    <button
                      onClick={() => handleCopyLink(viewingMeeting.meetingLink!)}
                      className="p-2 rounded hover:bg-hv transition-colors"
                      title="نسخ الرابط"
                    >
                      <FaCopy size={14} />
                    </button>
                    <button
                      onClick={() => handleShareMeeting(viewingMeeting)}
                      className="p-2 rounded hover:bg-hv transition-colors"
                      title="مشاركة"
                    >
                      <FaShare size={14} />
                    </button>
                  </div>
                )}
                {viewingMeeting.meetingId && (
                  <div className="mt-2 text-xs text-gray-500">
                    <span>معرف الاجتماع: {viewingMeeting.meetingId}</span>
                    {viewingMeeting.meetingPassword && (
                      <span className="mr-3">كلمة المرور: {viewingMeeting.meetingPassword}</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg" style={{ background: 'var(--inp)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500">
                    <FaMapMarkerAlt size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{viewingMeeting.region} - {getCurrentBranch()?.name}</h4>
                    <p className="text-sm text-gray-500">{getCurrentBranch()?.address}</p>
                    <p className="text-sm mt-1">القاعة: {viewingMeeting.room}</p>
                    
                    {/* المرافق */}
                    {branchAmenities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {branchAmenities.map(amenity => (
                          <span key={amenity} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--hv)' }}>
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* زر الخريطة */}
                    {getCurrentBranch()?.latitude && getCurrentBranch()?.longitude && (
                      <button
                        onClick={() => window.open(`https://www.google.com/maps?q=${getCurrentBranch()?.latitude},${getCurrentBranch()?.longitude}`, '_blank')}
                        className="mt-2 text-xs text-brand-light hover:text-brand transition-colors flex items-center gap-1"
                      >
                        <FaMap size={10} /> فتح في الخريطة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* الأجندة */}
            {viewingMeeting.agenda && viewingMeeting.agenda.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">أجندة الاجتماع</label>
                <div className="space-y-2">
                  {viewingMeeting.agenda.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'var(--hv)' }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-brand/20 text-brand">
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* الملاحظات */}
            {viewingMeeting.notes && (
              <div>
                <label className="text-sm font-medium mb-2 block">ملاحظات إضافية</label>
                <div className="p-3 rounded-lg whitespace-pre-wrap" style={{ background: 'var(--inp)' }}>
                  {viewingMeeting.notes}
                </div>
              </div>
            )}
            
            {/* المشاركون */}
            {viewingMeeting.attendeesUids && viewingMeeting.attendeesUids.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">المشاركون ({viewingMeeting.attendeesUids.length})</label>
                <div className="grid grid-cols-2 gap-2">
                  {viewingMeeting.attendeesUids.map(uid => {
                    const user = users.find(u => u.uid === uid);
                    return (
                      <div key={uid} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--hv)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--brand-primary)' }}>
                          {user ? getUserInitials(user.name) : '?'}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">{user?.name || 'مستخدم غير معروف'}</div>
                          <div className="text-xs text-gray-500">{user?.department}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* المنشنات */}
            {viewingMeeting.mentionsUids && viewingMeeting.mentionsUids.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">إشارات (@)</label>
                <div className="flex flex-wrap gap-2">
                  {viewingMeeting.mentionsUids.map(uid => {
                    const user = users.find(u => u.uid === uid);
                    return (
                      <div key={uid} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                        <FaUser size={10} />
                        <span>{user?.name || uid}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* معلومات إضافية */}
            <div className="text-[10px] text-gray-500 pt-2 border-t" style={{ borderColor: 'var(--bd)' }}>
              <div>تم الإنشاء: {format(viewingMeeting.createdAt, 'dd MMM yyyy, hh:mm a', { locale: arSA })}</div>
              <div>المنظم: {getUserName(viewingMeeting.createdByUid)}</div>
              {viewingMeeting.isPublic ? (
                <div>عام (يراه الجميع)</div>
              ) : (
                <div>خاص (المدعوون فقط)</div>
              )}
            </div>
          </div>
          
          {/* أزرار الإجراءات */}
          <div className="modal-footer">
            <button onClick={() => setViewingMeeting(null)} className="btn-outline">
              إغلاق
            </button>
            {!isPast && (
              <button
                onClick={() => handleSendReminders(viewingMeeting)}
                disabled={sendingReminders}
                className="btn-secondary"
              >
                {sendingReminders ? <FaSpinner className="animate-spin" /> : <FaBell className="ml-2" />}
                إرسال تذكير
              </button>
            )}
            {canEdit && (
              <>
                <button
                  onClick={() => {
                    setViewingMeeting(null);
                    openEditModal(viewingMeeting);
                  }}
                  className="btn-secondary"
                >
                  <FaEdit className="ml-2" /> تعديل
                </button>
                <button
                  onClick={() => {
                    setViewingMeeting(null);
                    setDeletingMeetingId(viewingMeeting.id);
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
  // نافذة إضافة/تعديل اجتماع
  // ==========================================
  
  const MeetingFormModal: React.FC = () => {
    const availableUsers = getAvailableUsers([...attendees, ...mentions]);
    const currentRegion = getCurrentRegion();
    const branches = getCurrentBranches();
    const rooms = getCurrentRooms();
    const amenities = getBranchAmenities();
    
    return (
      <div className="modal-overlay" onClick={() => setShowMeetingModal(false)}>
        <div className="modal-content max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-lg font-bold">
              {editingMeeting ? 'تعديل الاجتماع' : 'اجتماع جديد'}
            </h3>
            <button onClick={() => setShowMeetingModal(false)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body space-y-4">
            {/* عنوان الاجتماع */}
            <div>
              <label className="block text-sm font-medium mb-1">عنوان الاجتماع *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="أدخل عنوان الاجتماع"
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
            
            {/* نوع الاجتماع */}
            <div>
              <label className="block text-sm font-medium mb-1">نوع الاجتماع</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="online"
                    checked={type === 'online'}
                    onChange={() => setType('online')}
                    className="accent-brand"
                  />
                  <span className="text-sm">عن بُعد (Online)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="offline"
                    checked={type === 'offline'}
                    onChange={() => setType('offline')}
                    className="accent-brand"
                  />
                  <span className="text-sm">حضوري (Offline)</span>
                </label>
              </div>
            </div>
            
            {/* تفاصيل الاجتماع حسب النوع */}
            {type === 'online' ? (
              <div className="p-3 rounded-lg" style={{ background: 'var(--inp)' }}>
                <label className="block text-sm font-medium mb-1">منصة الاجتماع</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as MeetingPlatform)}
                  className="input"
                >
                  <option value="zoom">Zoom</option>
                  <option value="meet">Google Meet</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="webex">Cisco Webex</option>
                  <option value="custom">رابط مخصص</option>
                </select>
                {platform === 'custom' && (
                  <input
                    type="url"
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    className="input mt-2"
                    placeholder="https://..."
                  />
                )}
              </div>
            ) : (
              <div className="space-y-3 p-3 rounded-lg" style={{ background: 'var(--inp)' }}>
                {/* المنطقة */}
                <div>
                  <label className="block text-sm font-medium mb-1">المنطقة</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="input"
                  >
                    {REGIONS_DATA.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* الفرع */}
                <div>
                  <label className="block text-sm font-medium mb-1">الفرع</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="input"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* القاعة */}
                <div>
                  <label className="block text-sm font-medium mb-1">القاعة</label>
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="input"
                  >
                    {rooms.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                
                {/* مرافق الفرع */}
                {amenities.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-1">المرافق المتاحة</label>
                    <div className="flex flex-wrap gap-2">
                      {amenities.map(amenity => (
                        <span key={amenity} className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--hv)' }}>
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* المشاركون */}
            <div>
              <label className="block text-sm font-medium mb-1">المشاركون</label>
              <div className="relative">
                <div className="flex flex-wrap gap-2 p-2 rounded-lg min-h-[42px]" style={{ background: 'var(--inp)', border: '1px solid var(--bd)' }}>
                  {attendees.map(uid => {
                    const user = users.find(u => u.uid === uid);
                    return (
                      <div key={uid} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: 'var(--hv)' }}>
                        <span>{user?.name || uid}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(uid)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    );
                  })}
                  <input
                    type="text"
                    value={attendeeSearch}
                    onChange={(e) => {
                      setAttendeeSearch(e.target.value);
                      setShowAttendeeDropdown(true);
                    }}
                    onFocus={() => setShowAttendeeDropdown(true)}
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[100px]"
                    placeholder="أضف مشاركاً..."
                  />
                </div>
                
                {showAttendeeDropdown && availableUsers.filter(u => 
                  u.name.includes(attendeeSearch) && !attendees.includes(u.uid)
                ).length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg shadow-lg overflow-hidden" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)' }}>
                    {availableUsers
                      .filter(u => u.name.includes(attendeeSearch) && !attendees.includes(u.uid))
                      .map(user => (
                        <div
                          key={user.uid}
                          onClick={() => handleAddAttendee(user.uid)}
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
            </div>
            
            {/* الأجندة */}
            <div>
              <label className="block text-sm font-medium mb-1">أجندة الاجتماع</label>
              <div className="space-y-2">
                {agenda.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleAgendaChange(idx, e.target.value)}
                      className="input flex-1"
                      placeholder={`بند ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveAgendaItem(idx)}
                      className="p-2 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                      disabled={agenda.length === 1}
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddAgendaItem}
                  className="text-sm text-brand-light hover:text-brand transition-colors"
                >
                  + إضافة بند جديد
                </button>
              </div>
            </div>
            
            {/* الملاحظات */}
            <div>
              <label className="block text-sm font-medium mb-1">ملاحظات إضافية</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="textarea"
                rows={3}
                placeholder="أي ملاحظات إضافية عن الاجتماع..."
              />
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
              <label htmlFor="isPublic" className="text-sm">اجتماع عام (يراه الجميع)</label>
            </div>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowMeetingModal(false)} className="btn-outline">
              إلغاء
            </button>
            <button onClick={handleSaveMeeting} className="btn-primary">
              <FaCheck className="ml-2" /> {editingMeeting ? 'تحديث' : 'إنشاء'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // نافذة الانضمام للاجتماع
  // ==========================================
  
  const JoinMeetingModal: React.FC = () => {
    if (!joiningMeeting) return null;
    
    const openMeetingLink = () => {
      if (joiningMeeting.meetingLink) {
        window.open(joiningMeeting.meetingLink, '_blank');
        setShowJoinModal(false);
      }
    };
    
    return (
      <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
        <div className="modal-content max-w-md text-center" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="text-lg font-bold">الانضمام إلى الاجتماع</h3>
            <button onClick={() => setShowJoinModal(false)} className="icon-btn">
              <FaTimes />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-500/10">
              <FaVideo className="text-green-500 text-3xl" />
            </div>
            <h4 className="font-bold text-lg mb-2">{joiningMeeting.title}</h4>
            <p className="text-gray-500 mb-4">
              {formatDate(joiningMeeting.date)} الساعة {joiningMeeting.time}
            </p>
            
            <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--inp)' }}>
              <p className="text-sm">سيتم فتح رابط الاجتماع في نافذة جديدة</p>
            </div>
            
            <button onClick={openMeetingLink} className="btn-primary w-full">
              <FaExternalLinkAlt className="ml-2" /> فتح رابط الاجتماع
            </button>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowJoinModal(false)} className="btn-outline">
              إلغاء
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
    if (!deletingMeetingId) return null;
    
    const meetingToDelete = meetings.find(m => m.id === deletingMeetingId);
    
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
            <p className="mb-2">هل أنت متأكد من حذف هذا الاجتماع؟</p>
            <p className="text-sm text-gray-500">{meetingToDelete?.title}</p>
            <p className="text-xs text-gray-500 mt-4">لا يمكن التراجع عن هذا الإجراء</p>
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-outline">
              إلغاء
            </button>
            <button onClick={handleDeleteMeeting} className="btn-danger">
              <FaTrash className="ml-2" /> حذف نهائي
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ==========================================
  // عرض التقويم المصغر
  // ==========================================
  
  const CalendarView: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const startDay = monthStart.getDay();
    
    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayMeetings = meetings.filter(m => m.date === dateStr);
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      
      days.push(
        <div
          key={d}
          className={`p-2 rounded-lg cursor-pointer transition-all ${isToday ? 'ring-2 ring-brand' : 'hover:bg-hv'}`}
          onClick={() => {
            setDate(dateStr);
            setFilterDate('all');
            setShowFilters(true);
          }}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-brand' : ''}`}>{d}</div>
          {dayMeetings.length > 0 && (
            <div className="mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-brand mx-auto" />
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="icon-btn">
            <FaChevronRight />
          </button>
          <h3 className="font-bold">
            {format(currentMonth, 'MMMM yyyy', { locale: arSA })}
          </h3>
          <button onClick={() => setCurrentMonth(new Date())} className="icon-btn">
            <FaChevronLeft />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
          {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  const filteredMeetingsList = filteredMeetings();
  const stats = {
    total: meetings.length,
    today: meetings.filter(m => isMeetingToday(m.date)).length,
    upcoming: meetings.filter(m => m.date > new Date().toISOString().split('T')[0]).length,
    past: meetings.filter(m => isMeetingPast(m.date)).length,
    online: meetings.filter(m => m.type === 'online').length,
    offline: meetings.filter(m => m.type === 'offline').length
  };
  
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* الرأس والإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">إجمالي الاجتماعات</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">اليوم</p>
          <p className="text-2xl font-bold text-green-500">{stats.today}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">القادمة</p>
          <p className="text-2xl font-bold text-blue-500">{stats.upcoming}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">السابقة</p>
          <p className="text-2xl font-bold text-gray-500">{stats.past}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">عن بُعد</p>
          <p className="text-2xl font-bold text-purple-500">{stats.online}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">حضوري</p>
          <p className="text-2xl font-bold text-orange-500">{stats.offline}</p>
        </div>
      </div>
      
      {/* شريط التحكم */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الاجتماعات..."
            className="input pr-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
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
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 transition-all ${viewMode === 'calendar' ? 'bg-brand text-white' : 'hover:bg-hv'}`}
            >
              <FaCalendarAlt />
            </button>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`icon-btn ${showFilters ? 'bg-brand text-white' : ''}`}
          >
            <FaFilter />
          </button>
          
          <button onClick={openCreateModal} className="btn-primary">
            <FaPlus className="ml-2" /> اجتماع جديد
          </button>
        </div>
      </div>
      
      {/* لوحة الفلاتر */}
      {showFilters && (
        <div className="card p-4 animate-fadeIn">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">النوع:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as MeetingType | 'all')}
                className="input text-sm py-1.5"
              >
                <option value="all">الكل</option>
                <option value="online">عن بُعد</option>
                <option value="offline">حضوري</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">التاريخ:</span>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value as 'all' | 'today' | 'upcoming' | 'past')}
                className="input text-sm py-1.5"
              >
                <option value="all">الكل</option>
                <option value="today">اليوم</option>
                <option value="upcoming">القادمة</option>
                <option value="past">السابقة</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                setFilterType('all');
                setFilterDate('all');
              }}
              className="text-sm text-brand-light hover:text-brand transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      )}
      
      {/* عرض الاجتماعات حسب الوضع */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeetingsList.map(meeting => (
                <MeetingGridCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
          
          {viewMode === 'list' && (
            <div className="card p-0 overflow-hidden">
              <div className="divide-y" style={{ borderColor: 'var(--bd)' }}>
                {filteredMeetingsList.map(meeting => (
                  <MeetingListItem key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </div>
          )}
          
          {viewMode === 'calendar' && <CalendarView />}
        </>
      )}
      
      {/* النوافذ المنبثقة */}
      {showMeetingModal && <MeetingFormModal />}
      {viewingMeeting && <MeetingViewModal />}
      {showJoinModal && <JoinMeetingModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
    </div>
  );
};

export default MeetingsPage;