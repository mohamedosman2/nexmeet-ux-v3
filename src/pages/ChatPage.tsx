import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  limit,
  getDocs,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { 
  FaPaperPlane, 
  FaTrash, 
  FaPen, 
  FaBuilding, 
  FaUser, 
  FaUsers,
  FaImage,
  FaFile,
  FaPaperclip,
  FaSmile,
  FaMicrophone,
  FaStop,
  FaPlay,
  FaPause,
  FaDownload,
  FaTimes,
  FaCheck,
  FaCheckDouble,
  FaEllipsisV,
  FaPhone,
  FaVideo,
  FaSearch,
  FaPlus,
  FaMinus,
  FaArrowLeft,
  FaArrowRight,
  FaRegSmile,
  FaGrin,
  FaGrinTears,
  FaGrinHearts,
  FaGrinStars,
  FaGrinWink,
  FaComments,
  FaSpinner,
  FaList,
  FaThLarge,
  FaTag,
  FaExclamationTriangle,
  FaChevronRight,
  FaChevronLeft
} from 'react-icons/fa';

// ==========================================
// الأنواع
// ==========================================

interface ChatMessage {
  id: string;
  groupId: string;
  fromUid: string;
  text: string;
  timestamp: number;
  isEdited: boolean;
  isDeleted: boolean;
  readBy: string[];
  attachments?: Attachment[];
  replyToId?: string;
  reactions?: Reaction[];
}

interface Attachment {
  name: string;
  type: string;
  url: string;
  size?: number;
}

interface Reaction {
  emoji: string;
  users: string[];
}

interface ChatGroup {
  id: string;
  name: string;
  type: 'company' | 'department' | 'private';
  membersUids: string[];
  createdByUid: string;
  createdAt: number;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: number;
}

interface User {
  uid: string;
  name: string;
  email: string;
  department: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: number;
}

// ==========================================
// الإيموجي المتاحة
// ==========================================

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈'
];

// ==========================================
// إعدادات WebRTC للمكالمات الصوتية والفيديو
// ==========================================

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

// ==========================================
// صفحة المحادثات الرئيسية
// ==========================================

export const ChatPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { isTopManagement, isManager } = usePermissions();
  
  // ==========================================
  // حالات البيانات
  // ==========================================
  
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // ==========================================
  // حالات الإدخال
  // ==========================================
  
  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // ==========================================
  // حالات المرفقات
  // ==========================================
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ==========================================
  // حالات المنشن
  // ==========================================
  
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  // ==========================================
  // حالات الصوت والفيديو (WebRTC)
  // ==========================================
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [callPeerId, setCallPeerId] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit; type: string } | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ==========================================
  // حالات البحث
  // ==========================================
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
  // بناء قائمة المجموعات
  // ==========================================
  
  useEffect(() => {
    if (!userProfile) return;
    
    const groupsList: ChatGroup[] = [];
    
    // 1. مجموعة الشركة (الكل)
    groupsList.push({
      id: 'company',
      name: 'مجموعة الشركة',
      type: 'company',
      membersUids: users.map(u => u.uid),
      createdByUid: 'system',
      createdAt: Date.now()
    });
    
    // 2. مجموعات الإدارات
    const departments = new Set(users.map(u => u.department));
    departments.forEach(dept => {
      if (isTopManagement || userProfile.department === dept) {
        groupsList.push({
          id: `dept_${dept}`,
          name: `مجموعة ${dept}`,
          type: 'department',
          membersUids: users.filter(u => u.department === dept).map(u => u.uid),
          createdByUid: 'system',
          createdAt: Date.now()
        });
      }
    });
    
    // 3. المحادثات الخاصة (مع المستخدمين الآخرين)
    users.forEach(user => {
      if (user.uid !== userProfile.uid) {
        const dmId = `dm_${[userProfile.uid, user.uid].sort().join('_')}`;
        groupsList.push({
          id: dmId,
          name: user.name,
          type: 'private',
          membersUids: [userProfile.uid, user.uid],
          createdByUid: userProfile.uid,
          createdAt: Date.now(),
          avatarUrl: user.avatarUrl
        });
      }
    });
    
    setGroups(groupsList);
  }, [users, userProfile, isTopManagement]);
  
  // ==========================================
  // جلب الرسائل للمجموعة النشطة
  // ==========================================
  
  useEffect(() => {
    if (!activeGroupId) return;
    
    const messagesQuery = query(
      collection(db, 'messages'),
      where('groupId', '==', activeGroupId),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(fetchedMessages);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      updateReadStatus(fetchedMessages);
    });
    
    return unsubscribe;
  }, [activeGroupId]);
  
  // ==========================================
  // تحديث حالة القراءة
  // ==========================================
  
  const updateReadStatus = async (messagesList: ChatMessage[]) => {
    if (!currentUser) return;
    
    const unreadMessages = messagesList.filter(
      m => m.fromUid !== currentUser.uid && !m.readBy.includes(currentUser.uid)
    );
    
    for (const message of unreadMessages) {
      await updateDoc(doc(db, 'messages', message.id), {
        readBy: [...message.readBy, currentUser.uid]
      });
    }
  };
  
  // ==========================================
  // إرسال رسالة جديدة
  // ==========================================
  
  const handleSendMessage = async () => {
    if (!inputText.trim() && attachments.length === 0) return;
    if (!activeGroupId || !userProfile) return;
    
    setSendingMessage(true);
    
    try {
      const mentionRegex = /@(\w+)/g;
      const mentions = [...inputText.matchAll(mentionRegex)].map(m => m[1]);
      const mentionUids = users.filter(u => mentions.includes(u.name)).map(u => u.uid);
      
      const messageData = {
        groupId: activeGroupId,
        fromUid: userProfile.uid,
        text: inputText.trim(),
        timestamp: Date.now(),
        isEdited: false,
        isDeleted: false,
        readBy: [userProfile.uid],
        attachments: attachments,
        replyToId: replyToMessage?.id || null,
        mentionsUids: mentionUids
      };
      
      await addDoc(collection(db, 'messages'), messageData);
      
      setInputText('');
      setAttachments([]);
      setReplyToMessage(null);
      setShowEmojiPicker(false);
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('حدث خطأ في إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
  };
  
  // ==========================================
  // حذف رسالة
  // ==========================================
  
  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        isDeleted: true,
        text: 'تم حذف هذه الرسالة'
      });
      toast.success('تم حذف الرسالة');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('حدث خطأ في حذف الرسالة');
    }
  };
  
  // ==========================================
  // تعديل رسالة
  // ==========================================
  
  const handleEditMessage = async (messageId: string) => {
    if (!editText.trim()) return;
    
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        text: editText.trim(),
        isEdited: true
      });
      setEditingMessageId(null);
      setEditText('');
      toast.success('تم تعديل الرسالة');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('حدث خطأ في تعديل الرسالة');
    }
  };
  
  // ==========================================
  // إضافة تفاعل (Reaction)
  // ==========================================
  
  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    const existingReaction = message.reactions?.find(r => r.emoji === emoji);
    let newReactions;
    
    if (existingReaction) {
      if (existingReaction.users.includes(currentUser.uid)) {
        existingReaction.users = existingReaction.users.filter(uid => uid !== currentUser.uid);
        newReactions = message.reactions?.filter(r => r.users.length > 0) || [];
      } else {
        existingReaction.users.push(currentUser.uid);
        newReactions = message.reactions || [];
      }
    } else {
      newReactions = [...(message.reactions || []), { emoji, users: [currentUser.uid] }];
    }
    
    try {
      await updateDoc(doc(db, 'messages', messageId), { reactions: newReactions });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };
  
  // ==========================================
  // رفع ملفات
  // ==========================================
  
  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const uploadedFiles: Attachment[] = [];
    
    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`الملف ${file.name} كبير جداً (حد أقصى 10 ميجابايت)`);
        continue;
      }
      
      const uploadingFile = { name: file.name, progress: 0 };
      setUploadingFiles(prev => [...prev, uploadingFile]);
      
      try {
        const path = `chat/${activeGroupId}/${Date.now()}_${file.name}`;
        const downloadURL = await uploadFile(path, file, (progress) => {
          setUploadingFiles(prev => 
            prev.map(f => f.name === file.name ? { ...f, progress } : f)
          );
        });
        
        uploadedFiles.push({
          name: file.name,
          type: file.type,
          url: downloadURL,
          size: file.size
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
  // تسجيل صوتي
  // ==========================================
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        const fakeEvent = { target: { files: [audioFile] } } as any;
        handleFileUpload(fakeEvent.target.files);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks(chunks);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('لا يمكن الوصول إلى الميكروفون');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };
  
  // ==========================================
  // دوال المكالمات الصوتية والفيديو (WebRTC)
  // ==========================================
  
  const startAudioCall = async (peerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const pc = new RTCPeerConnection(configuration);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate:', event.candidate);
        }
      };
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const callRef = doc(db, 'calls', `${currentUser?.uid}_${peerId}`);
      await setDoc(callRef, {
        from: currentUser?.uid,
        to: peerId,
        offer: offer,
        type: 'audio',
        status: 'calling',
        createdAt: Date.now()
      });
      
      setPeerConnection(pc);
      setIsCallActive(true);
      setIsVideoCall(false);
      setCallPeerId(peerId);
      setCallStatus('calling');
      
      callTimeoutRef.current = setTimeout(() => {
        if (callStatus === 'calling') {
          endCall();
          toast('لم يتم الرد على المكالمة');
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('لا يمكن بدء المكالمة');
    }
  };
  
  const startVideoCall = async (peerId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const pc = new RTCPeerConnection(configuration);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate:', event.candidate);
        }
      };
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const callRef = doc(db, 'calls', `${currentUser?.uid}_${peerId}`);
      await setDoc(callRef, {
        from: currentUser?.uid,
        to: peerId,
        offer: offer,
        type: 'video',
        status: 'calling',
        createdAt: Date.now()
      });
      
      setPeerConnection(pc);
      setIsCallActive(true);
      setIsVideoCall(true);
      setCallPeerId(peerId);
      setCallStatus('calling');
      
      callTimeoutRef.current = setTimeout(() => {
        if (callStatus === 'calling') {
          endCall();
          toast('لم يتم الرد على المكالمة');
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error starting video call:', error);
      toast.error('لا يمكن بدء مكالمة الفيديو');
    }
  };
  
  const acceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: incomingCall.type === 'video'
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const pc = new RTCPeerConnection(configuration);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
      
      await pc.setRemoteDescription(incomingCall.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      const callRef = doc(db, 'calls', `${currentUser?.uid}_${incomingCall.from}`);
      await updateDoc(callRef, {
        answer: answer,
        status: 'connected',
        answeredAt: Date.now()
      });
      
      setPeerConnection(pc);
      setIsCallActive(true);
      setIsVideoCall(incomingCall.type === 'video');
      setCallPeerId(incomingCall.from);
      setCallStatus('connected');
      setIncomingCall(null);
      
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('حدث خطأ في قبول المكالمة');
    }
  };
  
  const rejectCall = () => {
    if (incomingCall) {
      const callRef = doc(db, 'calls', `${currentUser?.uid}_${incomingCall.from}`);
      updateDoc(callRef, { status: 'rejected' }).catch(console.error);
      setIncomingCall(null);
      toast('تم رفض المكالمة');
    }
  };
  
  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
    }
    
    setIsCallActive(false);
    setIsVideoCall(false);
    setRemoteStream(null);
    setCallPeerId(null);
    setCallStatus('ended');
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };
  
  // الاستماع للمكالمات الواردة
  useEffect(() => {
    if (!currentUser) return;
    
    const callsQuery = query(
      collection(db, 'calls'),
      where('to', '==', currentUser.uid),
      where('status', '==', 'calling')
    );
    
    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      snapshot.forEach((doc) => {
        const callData = doc.data();
        if (callData.offer && !incomingCall) {
          setIncomingCall({
            from: callData.from,
            offer: callData.offer,
            type: callData.type || 'audio'
          });
          toast(`مكالمة ${callData.type === 'video' ? 'فيديو' : 'صوتية'} واردة من ${getUserName(callData.from)}`);
        }
      });
    });
    
    return () => unsubscribe();
  }, [currentUser, incomingCall]);
  
  // ==========================================
  // معالجة المنشنات أثناء الكتابة
  // ==========================================
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    
    const cursorPos = e.target.selectionStart || 0;
    setCursorPosition(cursorPos);
    
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };
  
  const insertMention = (userName: string) => {
    const textBeforeCursor = inputText.slice(0, cursorPosition);
    const textAfterCursor = inputText.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${userName} ` + textAfterCursor;
    
    setInputText(newText);
    setShowMentionDropdown(false);
    inputRef.current?.focus();
  };
  
  // ==========================================
  // دوال مساعدة
  // ==========================================
  
  const getUserName = (uid: string) => {
    const user = users.find(u => u.uid === uid);
    return user?.name || 'مستخدم';
  };
  
  const getUserAvatar = (uid: string) => {
    const user = users.find(u => u.uid === uid);
    return user?.avatarUrl;
  };
  
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };
  
  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group?.name || 'المحادثة';
  };
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FaImage />;
    return <FaFile />;
  };
  
  // ==========================================
  // عرض قائمة المحادثات
  // ==========================================
  
  const ChatList: React.FC = () => {
    const [filteredGroups, setFilteredGroups] = useState(groups);
    
    useEffect(() => {
      if (searchQuery) {
        setFilteredGroups(groups.filter(g => 
          g.name.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      } else {
        setFilteredGroups(groups);
      }
    }, [searchQuery, groups]);
    
    return (
      <div className="w-80 flex-shrink-0 border-l" style={{ borderColor: 'var(--bd)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--bd)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">المحادثات</h2>
            <button onClick={() => setShowSearch(!showSearch)} className="icon-btn">
              <FaSearch size={14} />
            </button>
          </div>
          {showSearch && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المحادثات..."
              className="input text-sm"
              autoFocus
            />
          )}
        </div>
        
        <div className="overflow-y-auto h-[calc(100vh-200px)]">
          {filteredGroups.map(group => {
            const isActive = activeGroupId === group.id;
            const lastMessage = messages[messages.length - 1];
            const unreadCount = messages.filter(m => 
              m.fromUid !== currentUser?.uid && !m.readBy.includes(currentUser?.uid || '')
            ).length;
            
            return (
              <div
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`p-3 flex items-center gap-3 cursor-pointer transition-all hover:bg-hv ${isActive ? 'bg-hv border-r-3 border-brand' : ''}`}
                style={{ borderRightColor: isActive ? 'var(--brand-primary)' : 'transparent' }}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ background: group.type === 'private' ? 'var(--brand-primary)' : 'var(--brand-secondary)' }}>
                    {group.type === 'company' ? <FaBuilding /> : group.type === 'department' ? <FaUsers /> : getUserInitials(group.name)}
                  </div>
                  {group.type === 'private' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2" style={{ borderColor: 'var(--bg2)' }} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{group.name}</span>
                    {lastMessage && (
                      <span className="text-[10px] text-gray-500">{formatTime(lastMessage.timestamp)}</span>
                    )}
                  </div>
                  {lastMessage && !lastMessage.isDeleted && (
                    <p className="text-xs text-gray-500 truncate">{lastMessage.text}</p>
                  )}
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full bg-brand">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // ==========================================
  // عرض منطقة الدردشة
  // ==========================================
  
  const ChatArea: React.FC = () => {
    if (!activeGroupId) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center">
          <FaComments className="text-6xl text-gray-500 mb-4" />
          <p className="text-gray-500">اختر محادثة للبدء</p>
        </div>
      );
    }
    
    const activeGroup = groups.find(g => g.id === activeGroupId);
    const isPrivate = activeGroup?.type === 'private';
    const peerId = isPrivate ? activeGroup?.membersUids.find(uid => uid !== currentUser?.uid) : null;
    
    return (
      <div className="flex-1 flex flex-col">
        {/* رأس الدردشة */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bd)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: activeGroup?.type === 'private' ? 'var(--brand-primary)' : 'var(--brand-secondary)' }}>
              {activeGroup?.type === 'company' ? <FaBuilding /> : activeGroup?.type === 'department' ? <FaUsers /> : getUserInitials(activeGroup?.name || '')}
            </div>
            <div>
              <h3 className="font-semibold">{activeGroup?.name}</h3>
              <p className="text-xs text-gray-500">
                {activeGroup?.type === 'private' ? 'رسالة خاصة' : activeGroup?.type === 'department' ? 'مجموعة إدارة' : 'مجموعة الشركة'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isPrivate && peerId && !isCallActive && (
              <button
                onClick={() => startAudioCall(peerId)}
                className="icon-btn"
                title="مكالمة صوتية"
              >
                <FaPhone size={14} />
              </button>
            )}
            {isPrivate && peerId && !isCallActive && (
              <button
                onClick={() => startVideoCall(peerId)}
                className="icon-btn"
                title="مكالمة فيديو"
              >
                <FaVideo size={14} />
              </button>
            )}
          </div>
        </div>
        
        {/* نافذة المكالمة النشطة */}
        {isCallActive && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-4xl aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-lg"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 w-32 h-24 object-cover rounded-lg border-2 border-white shadow-lg"
              />
              
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
                <button
                  onClick={endCall}
                  className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                >
                  <FaPhone size={20} />
                </button>
                <button
                  onClick={() => {
                    if (localStream) {
                      const audioTrack = localStream.getAudioTracks()[0];
                      if (audioTrack) {
                        audioTrack.enabled = !audioTrack.enabled;
                      }
                    }
                  }}
                  className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600 transition-colors"
                >
                  <FaMicrophone size={20} />
                </button>
                {isVideoCall && (
                  <button
                    onClick={() => {
                      if (localStream) {
                        const videoTrack = localStream.getVideoTracks()[0];
                        if (videoTrack) {
                          videoTrack.enabled = !videoTrack.enabled;
                        }
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600 transition-colors"
                  >
                    <FaVideo size={20} />
                  </button>
                )}
              </div>
              
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-sm">
                {callStatus === 'calling' && 'جارٍ الاتصال...'}
                {callStatus === 'ringing' && 'يرن...'}
                {callStatus === 'connected' && 'متصل'}
              </div>
            </div>
          </div>
        )}
        
        {/* نافذة المكالمة الواردة */}
        {incomingCall && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
            <div className="bg-bg3 rounded-2xl p-6 text-center max-w-sm w-full mx-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-brand/20 flex items-center justify-center">
                <FaPhone className="text-brand text-3xl animate-pulse" />
              </div>
              <h3 className="text-xl font-bold mb-2">مكالمة واردة</h3>
              <p className="text-gray-400 mb-6">
                {getUserName(incomingCall.from)} يطلب مكالمة {incomingCall.type === 'video' ? 'فيديو' : 'صوتية'}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={acceptCall}
                  className="px-6 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  قبول
                </button>
                <button
                  onClick={rejectCall}
                  className="px-6 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  رفض
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* منطقة الرسائل */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--chat)' }}>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-hv">
                <FaComments className="text-2xl text-gray-500" />
              </div>
              <p className="text-gray-500">لا توجد رسائل بعد</p>
              <p className="text-xs text-gray-500 mt-1">كن أول من يرسل رسالة</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isMine = message.fromUid === currentUser?.uid;
              const isDeleted = message.isDeleted;
              const prevMessage = messages[index - 1];
              const showAvatar = !prevMessage || prevMessage.fromUid !== message.fromUid;
              const sender = users.find(u => u.uid === message.fromUid);
              const reactions = message.reactions || [];
              
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[70%] ${isMine ? 'flex-row-reverse' : ''}`}>
                    {!isMine && showAvatar && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1" style={{ background: 'var(--brand-secondary)' }}>
                        {getUserInitials(sender?.name || '?')}
                      </div>
                    )}
                    {!isMine && !showAvatar && <div className="w-8 flex-shrink-0" />}
                    
                    <div className="group relative">
                      <div className={`chat-bubble ${isMine ? 'mine' : 'other'}`}>
                        {!isMine && activeGroup?.type !== 'private' && (
                          <div className="text-[10px] font-bold mb-1 text-brand-light">
                            {sender?.name}
                          </div>
                        )}
                        
                        {message.replyToId && (
                          <div className="text-[10px] p-2 mb-2 rounded opacity-70" style={{ background: 'rgba(0,0,0,0.1)' }}>
                            <span className="font-medium">رد على:</span> {
                              messages.find(m => m.id === message.replyToId)?.text
                            }
                          </div>
                        )}
                        
                        {isDeleted ? (
                          <em className="text-xs opacity-60">تم حذف هذه الرسالة</em>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                            
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.url}
                                    download={att.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-1.5 rounded text-xs hover:bg-black/10 transition-colors"
                                  >
                                    {getFileIcon(att.type)}
                                    <span className="flex-1">{att.name}</span>
                                    <FaDownload size={10} />
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        
                        {reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {reactions.map((reaction, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleAddReaction(message.id, reaction.emoji)}
                                className="text-xs px-1.5 py-0.5 rounded-full bg-black/20 hover:bg-black/30 transition-colors"
                              >
                                {reaction.emoji} {reaction.users.length}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        <div className={`text-[9px] mt-1 flex items-center gap-1 ${isMine ? 'text-white/60 justify-end' : 'text-gray-500'}`}>
                          <span>{formatTime(message.timestamp)}</span>
                          {message.isEdited && <span>(معدلة)</span>}
                          {isMine && (
                            <span>
                              {message.readBy.length > 1 ? <FaCheckDouble size={10} /> : <FaCheck size={10} />}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {!isDeleted && isMine && (
                        <div className="absolute top-0 left-0 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mr-2">
                          <button
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditText(message.text);
                            }}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-bg3 border border-bd hover:text-brand"
                          >
                            <FaPen size={10} />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-bg3 border border-bd hover:text-red-500"
                          >
                            <FaTrash size={10} />
                          </button>
                        </div>
                      )}
                      
                      {!isDeleted && (
                        <div className={`absolute ${isMine ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <div className="relative">
                            <button
                              onClick={() => {
                                const picker = document.createElement('div');
                                picker.className = 'absolute bottom-full mb-2 p-2 rounded-lg shadow-xl z-50';
                                picker.style.background = 'var(--bg3)';
                                picker.style.border = '1px solid var(--bd)';
                                picker.style.width = '280px';
                                picker.style.maxHeight = '200px';
                                picker.style.overflowY = 'auto';
                                picker.style.display = 'grid';
                                picker.style.gridTemplateColumns = 'repeat(8, 1fr)';
                                picker.style.gap = '4px';
                                
                                EMOJIS.forEach(emoji => {
                                  const btn = document.createElement('button');
                                  btn.textContent = emoji;
                                  btn.className = 'p-1 rounded hover:bg-hv transition-colors';
                                  btn.onclick = () => {
                                    handleAddReaction(message.id, emoji);
                                    picker.remove();
                                  };
                                  picker.appendChild(btn);
                                });
                                
                                document.body.appendChild(picker);
                                const rect = (document.activeElement as HTMLElement)?.getBoundingClientRect();
                                if (rect) {
                                  picker.style.left = `${rect.left}px`;
                                  picker.style.bottom = `${window.innerHeight - rect.top + 10}px`;
                                }
                                
                                setTimeout(() => {
                                  document.addEventListener('click', function onClickOutside(e) {
                                    if (!picker.contains(e.target as Node)) {
                                      picker.remove();
                                      document.removeEventListener('click', onClickOutside);
                                    }
                                  });
                                }, 0);
                              }}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-bg3 border border-bd hover:text-brand"
                            >
                              😊
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* منطقة كتابة الرسالة */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--bd)' }}>
          {replyToMessage && (
            <div className="flex items-center justify-between p-2 mb-2 rounded-lg" style={{ background: 'var(--hv)' }}>
              <div className="flex-1">
                <span className="text-xs font-medium">الرد على: </span>
                <span className="text-xs text-gray-500">{replyToMessage.text}</span>
              </div>
              <button onClick={() => setReplyToMessage(null)} className="text-gray-500 hover:text-red-500">
                <FaTimes size={12} />
              </button>
            </div>
          )}
          
          {(attachments.length > 0 || uploadingFiles.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: 'var(--hv)' }}>
                  {getFileIcon(att.type)}
                  <span>{att.name}</span>
                  <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>
                    <FaTimes size={10} />
                  </button>
                </div>
              ))}
              {uploadingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs" style={{ background: 'var(--hv)' }}>
                  <FaSpinner className="animate-spin" size={10} />
                  <span>{file.name}</span>
                  <span className="text-[10px]">{file.progress}%</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="icon-btn">
              <FaPaperclip size={16} />
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
            
            <button onClick={isRecording ? stopRecording : startRecording} className={`icon-btn ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : ''}`}>
              {isRecording ? <FaStop size={14} /> : <FaMicrophone size={14} />}
            </button>
            
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="اكتب رسالتك هنا..."
                className="input pr-10"
                disabled={sendingMessage}
              />
              
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-brand transition-colors">
                <FaRegSmile size={18} />
              </button>
              
              {showMentionDropdown && (
                <div className="absolute bottom-full left-0 mb-1 w-64 rounded-lg shadow-xl overflow-hidden z-10" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)' }}>
                  {users
                    .filter(u => u.uid !== currentUser?.uid && u.name.toLowerCase().includes(mentionQuery))
                    .slice(0, 5)
                    .map(user => (
                      <div
                        key={user.uid}
                        onClick={() => insertMention(user.name)}
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-hv transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--brand-secondary)' }}>
                          {getUserInitials(user.name)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.department}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-1 p-2 rounded-lg shadow-xl z-10" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', width: '280px', maxHeight: '200px', overflowY: 'auto' }}>
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setInputText(inputText + emoji);
                          setShowEmojiPicker(false);
                          inputRef.current?.focus();
                        }}
                        className="p-1 rounded hover:bg-hv transition-colors text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button onClick={handleSendMessage} disabled={(!inputText.trim() && attachments.length === 0) || sendingMessage} className="btn-primary px-4">
              {sendingMessage ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
            </button>
          </div>
        </div>
        
        {editingMessageId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingMessageId(null)}>
            <div className="rounded-lg p-4 w-96" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold mb-3">تعديل الرسالة</h3>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="textarea mb-3" rows={3} autoFocus />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingMessageId(null)} className="btn-outline text-sm">إلغاء</button>
                <button onClick={() => handleEditMessage(editingMessageId)} className="btn-primary text-sm">حفظ التعديل</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex h-[calc(100vh-120px)] rounded-xl overflow-hidden border" style={{ borderColor: 'var(--bd)' }}>
      <ChatList />
      <ChatArea />
    </div>
  );
};

export default ChatPage;