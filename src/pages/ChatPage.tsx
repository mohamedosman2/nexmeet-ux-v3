// ==========================================
// صفحة المحادثات (Chat Page)
// تتضمن المجموعات العامة (الإدارات) والمحادثات الخاصة (DM)
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaTrash, FaPen, FaBuilding, FaUser } from 'react-icons/fa';
import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile, Department, ChatMessage } from '../types';

export const ChatPage: React.FC = () => {
  const { userProfile } = useAuth();
  
  // الحالات الأساسية
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // حالات الإدخال والتحكم
  const [inputText, setInputText] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  
  // نظام المنشن
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionDrop, setShowMentionDrop] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // جلب المستخدمين والإدارات
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: UserProfile[] = [];
      snapshot.forEach(docSnap => fetchedUsers.push({ ...docSnap.data(), uid: docSnap.id } as UserProfile));
      setUsers(fetchedUsers.filter(u => u.isActive));
    });

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snapshot) => {
      const fetchedDepts: Department[] = [];
      snapshot.forEach(docSnap => fetchedDepts.push({ id: docSnap.id, ...docSnap.data() } as Department));
      setDepartments(fetchedDepts);
    });

    return () => { unsubUsers(); unsubDepts(); };
  }, []);

  // جلب الرسائل عند تغيير المحادثة النشطة
  useEffect(() => {
    if (!activeChatId) return;
    
    const q = query(collection(db, 'messages'), where('groupId', '==', activeChatId));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const fetchedMsgs: ChatMessage[] = [];
      snapshot.forEach(docSnap => {
        fetchedMsgs.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
      });
      // الترتيب حسب الوقت محلياً لتجنب مشاكل فهارس Firebase (Indexes)
      fetchedMsgs.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(fetchedMsgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubMessages();
  }, [activeChatId]);

  // تجهيز قائمة المحادثات (المجموعات + الأفراد)
  const getChatList = () => {
    const list = [];
    // 1. مجموعة الشركة
    list.push({ id: 'g_all', name: 'مجموعة الشركة', isGroup: true, icon: <FaBuilding /> });
    
    // 2. مجموعات الإدارات (نجلبها من الأقسام الموجودة أو من المستخدمين)
    const deptsSet = new Set(departments.map(d => d.name));
    users.forEach(u => deptsSet.add(u.department)); // إضافة إدارات الموظفين حتى لو لم تكن مسجلة برمجياً
    
    Array.from(deptsSet).forEach(deptName => {
      if (deptName) {
        // إذا كان الموظف ضمن الإدارة أو كان من الإدارة العليا، يرى المجموعة
        if (userProfile?.primaryRole === 'chairman' || userProfile?.primaryRole === 'vp' || userProfile?.department === deptName) {
          list.push({ id: `g_${deptName}`, name: `مجموعة ${deptName}`, isGroup: true, icon: <FaBuilding /> });
        }
      }
    });

    // 3. المحادثات الفردية (DM)
    users.forEach(u => {
      if (u.uid !== userProfile?.uid) {
        const dmId = `dm_${[userProfile?.uid, u.uid].sort().join('_')}`;
        list.push({ id: dmId, name: u.name, isGroup: false, icon: u.name[0] });
      }
    });

    return list;
  };

  const chatList = getChatList();

  // الحصول على معلومات المحادثة النشطة حالياً
  const activeChatInfo = chatList.find(c => c.id === activeChatId);

  const getUserInfo = (uid: string) => users.find(u => u.uid === uid);

  // إرسال رسالة جديدة
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeChatId || !userProfile) return;

    try {
      await addDoc(collection(db, 'messages'), {
        groupId: activeChatId,
        fromUid: userProfile.uid,
        text: inputText.trim(),
        timestamp: Date.now(),
        isEdited: false
      });
      setInputText('');
      setShowMentionDrop(false);
    } catch (err) {
      console.error('خطأ في إرسال الرسالة', err);
    }
  };

  // حذف رسالة
  const handleDeleteMessage = async (msgId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الرسالة؟')) {
      try {
        await deleteDoc(doc(db, 'messages', msgId));
      } catch (err) {
        console.error(err);
      }
    }
  };

  // حفظ التعديل على الرسالة
  const handleSaveEdit = async (msgId: string) => {
    if (!editVal.trim()) return;
    try {
      await updateDoc(doc(db, 'messages', msgId), {
        text: editVal.trim(),
        isEdited: true
      });
      setEditingMsgId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // معالجة كتابة الرسالة لاكتشاف المنشن (@)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const mentionMatch = val.match(/@(\S*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1].toLowerCase());
      setShowMentionDrop(true);
    } else {
      setShowMentionDrop(false);
    }
  };

  const insertMention = (name: string) => {
    setInputText(inputText.replace(/@\S*$/, `@${name} `));
    setShowMentionDrop(false);
  };

  return (
    <div className="animate-fadeIn flex h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-[#1f1f1f]">
      
      {/* القائمة الجانبية للمحادثات (اليمين) */}
      <div className="w-64 bg-[#111] border-l border-[#1f1f1f] flex-shrink-0 overflow-y-auto">
        {chatList.map(chat => {
          const isActive = activeChatId === chat.id;
          return (
            <div 
              key={chat.id} 
              onClick={() => setActiveChatId(chat.id)}
              className={`si ${isActive ? 'ac' : ''} p-3 cursor-pointer border-b border-[#1f1f1f] hover:bg-[#151515] transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0
                    ${chat.id === 'g_all' ? 'bg-[#8B1A1A]' : chat.isGroup ? 'bg-[#1E3A6E]' : 'bg-[#8B1A1A]/50'}`
                  }
                >
                  {typeof chat.icon === 'string' ? chat.icon : chat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{chat.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">{chat.isGroup ? 'مجموعة نقاش' : 'رسالة خاصة'}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* منطقة الدردشة (اليسار) */}
      <div className="flex-1 flex flex-col bg-[#0d0d0d]">
        {activeChatId ? (
          <>
            {/* هيدر الدردشة */}
            <div className="h-14 bg-[#111] border-b border-[#1f1f1f] flex items-center px-4 gap-3 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${activeChatInfo?.id === 'g_all' ? 'bg-[#8B1A1A]' : 'bg-[#1E3A6E]'}`}>
                {typeof activeChatInfo?.icon === 'string' ? activeChatInfo.icon : activeChatInfo?.icon}
              </div>
              <div>
                <div className="font-semibold text-sm">{activeChatInfo?.name}</div>
                <div className="text-[10px] text-gray-500">متصل الآن</div>
              </div>
            </div>

            {/* منطقة عرض الرسائل */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-xs mt-10">لا توجد رسائل سابقة. ابدأ المحادثة الآن!</div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.fromUid === userProfile?.uid;
                  const sender = getUserInfo(msg.fromUid);
                  const timeStr = new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`cb max-w-[75%] p-3 rounded-2xl relative group ${isMine ? 'bg-gradient-to-br from-[#8B1A1A] to-[#6B1010] text-white rounded-br-sm' : 'bg-[#1e1e1a] rounded-bl-sm border border-[#1f1f1f]'}`}>
                        
                        {/* أزرار الحذف والتعديل للمرسل فقط */}
                        {isMine && (
                          <div className="absolute -top-3 left-0 hidden group-hover:flex gap-1 z-10">
                            <button onClick={() => handleDeleteMessage(msg.id)} className="w-6 h-6 rounded-full bg-[#151515] border border-[#1f1f1f] flex items-center justify-center text-[10px] text-gray-400 hover:text-red-500"><FaTrash /></button>
                            <button onClick={() => { setEditingMsgId(msg.id); setEditVal(msg.text); }} className="w-6 h-6 rounded-full bg-[#151515] border border-[#1f1f1f] flex items-center justify-center text-[10px] text-gray-400 hover:text-blue-400"><FaPen /></button>
                          </div>
                        )}

                        {/* اسم المرسل في المجموعات أو للطرف الآخر */}
                        {!isMine && <div className="text-[10px] font-bold mb-1 text-[#A52A2A]">{sender?.name || 'مستخدم'}</div>}

                        {/* محتوى الرسالة */}
                        {editingMsgId === msg.id ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <input className="ip text-sm p-1.5" value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus />
                            <div className="flex gap-2">
                              <button onClick={() => handleSaveEdit(msg.id)} className="bb text-[10px] py-1 px-3">حفظ</button>
                              <button onClick={() => setEditingMsgId(null)} className="text-[10px] px-3 py-1 rounded bg-[#111] hover:bg-[#222]">إلغاء</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        )}

                        <div className={`text-[9px] mt-2 flex items-center gap-1 ${isMine ? 'text-white/60' : 'text-gray-500'}`}>
                          {timeStr}
                          {msg.isEdited && <span>(معدّلة)</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* منطقة كتابة الرسالة وإرسالها */}
            <div className="p-3 border-t border-[#1f1f1f] bg-[#111] relative">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input 
                  className="ip flex-1 bg-[#151515]" 
                  placeholder="اكتب رسالتك هنا... (استخدم @ للإشارة لموظف)" 
                  value={inputText}
                  onChange={handleInputChange}
                />
                <button type="submit" className="bb w-12 flex items-center justify-center text-sm p-0 rounded-xl" disabled={!inputText.trim()}>
                  <FaPaperPlane />
                </button>
              </form>

              {/* القائمة المنسدلة للمنشن (@) */}
              {showMentionDrop && (
                <div className="md absolute bottom-full mb-2 w-64 bg-[#151515] border border-[#1f1f1f] rounded-lg shadow-xl overflow-hidden z-20">
                  {users.filter(u => u.name.includes(mentionQuery) && u.uid !== userProfile?.uid).length === 0 ? (
                    <div className="p-3 text-xs text-gray-500 text-center">لا يوجد موظف بهذا الاسم</div>
                  ) : (
                    users.filter(u => u.name.includes(mentionQuery) && u.uid !== userProfile?.uid).map(u => (
                      <div key={u.uid} onMouseDown={(e) => { e.preventDefault(); insertMention(u.name); }} className="mi p-2 hover:bg-[#111] cursor-pointer flex items-center gap-2 border-b border-[#1f1f1f] last:border-0">
                        <div className="w-6 h-6 rounded-full bg-[#1E3A6E] flex items-center justify-center text-white text-[9px]"><FaUser /></div>
                        <div>
                          <div className="text-xs">{u.name}</div>
                          <div className="text-[9px] text-gray-500">{u.department}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <FaPaperPlane className="text-4xl mb-4 opacity-20" />
            <p>يرجى اختيار محادثة من القائمة للبدء</p>
          </div>
        )}
      </div>
    </div>
  );
};