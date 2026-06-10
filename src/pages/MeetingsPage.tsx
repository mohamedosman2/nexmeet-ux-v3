import React, { useState, useEffect } from 'react';
import { 
  FaPlus, FaVideo, FaMapMarkerAlt, FaExternalLinkAlt, 
  FaTimes, FaCalendar, FaClock, FaGlobe, FaUser
} from 'react-icons/fa';
import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import type { Meeting, UserProfile } from '../types';

const BRANCHES_DATA = [
  { id: 'b1', rg: 'المنطقة الوسطى', br: [
      { id: 'br1', nm: 'فرع الحمرا (اليرموك)', rm: ['القاعة الرئيسية', 'تدريب 1', 'تدريب 2'] },
      { id: 'br2', nm: 'فرع الملك عبدالعزيز (الملك فهد)', rm: ['قاعة المديرين', 'المؤتمرات', 'العروض'] }
    ]
  },
  { id: 'b2', rg: 'المنطقة الشرقية', br: [{ id: 'br3', nm: 'فرع الدمام', rm: ['الشرق', 'الخليج'] }] },
  { id: 'b3', rg: 'المنطقة الشمالية', br: [{ id: 'br4', nm: 'فرع الجوف', rm: ['الجوف', 'الحدود'] }] },
  { id: 'b4', rg: 'المنطقة الغربية', br: [{ id: 'br5', nm: 'فرع جدة', rm: ['البحر الأحمر', 'المؤتمرات'] }] },
  { id: 'b5', rg: 'المنطقة الجنوبية', br: [{ id: 'br6', nm: 'فرع أبها', rm: ['السودة', 'أبيها'] }] }
];

const PLATFORMS: Record<string, string> = {
  zoom: 'Zoom', meet: 'Google Meet', teams: 'Microsoft Teams', webex: 'Cisco Webex', custom: 'أخرى'
};

const PLATFORM_LINKS: Record<string, string> = {
  zoom: 'https://zoom.us/join', meet: 'https://meet.google.com', teams: 'https://teams.microsoft.com/l/meetup-join', webex: 'https://webex.com/join'
};

export const MeetingsPage: React.FC = () => {
  const { userProfile } = useAuth();
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [type, setType] = useState<'online' | 'offline'>('online');
  const [platform, setPlatform] = useState('zoom');
  const [customLink, setCustomLink] = useState('');
  
  const [region, setRegion] = useState(BRANCHES_DATA[0].rg);
  const [branch, setBranch] = useState(BRANCHES_DATA[0].br[0].id);
  const [room, setRoom] = useState(BRANCHES_DATA[0].br[0].rm[0]);
  
  const [attendees, setAttendees] = useState<string[]>([]);
  const [attendeeQuery, setAssigneeQuery] = useState('');
  const [showAssigneeDrop, setShowAssigneeDrop] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const unsubMeetings = onSnapshot(collection(db, 'meetings'), (snapshot) => {
      const fetchedMeetings: Meeting[] = [];
      snapshot.forEach(docSnap => fetchedMeetings.push({ id: docSnap.id, ...docSnap.data() } as Meeting));
      setMeetings(fetchedMeetings);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers: UserProfile[] = [];
      snapshot.forEach(docSnap => fetchedUsers.push({ ...docSnap.data(), uid: docSnap.id } as UserProfile));
      setUsers(fetchedUsers);
    });

    return () => { unsubMeetings(); unsubUsers(); };
  }, []);

  useEffect(() => {
    const selectedRegion = BRANCHES_DATA.find(r => r.rg === region);
    if (selectedRegion && selectedRegion.br.length > 0) {
      setBranch(selectedRegion.br[0].id);
      setRoom(selectedRegion.br[0].rm[0]);
    }
  }, [region]);

  useEffect(() => {
    const selectedRegion = BRANCHES_DATA.find(r => r.rg === region);
    const selectedBranch = selectedRegion?.br.find(b => b.id === branch);
    if (selectedBranch && selectedBranch.rm.length > 0) {
      setRoom(selectedBranch.rm[0]);
    }
  }, [branch, region]);

  const canSeeMeeting = (meeting: Meeting) => {
    if (!userProfile) return false;
    if (userProfile.primaryRole === 'chairman' || userProfile.primaryRole === 'vp') return true;
    if (meeting.createdByUid === userProfile.uid) return true;
    if (meeting.attendeesUids?.includes(userProfile.uid)) return true;
    return false;
  };

  const visibleMeetings = meetings.filter(canSeeMeeting).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const openModal = () => {
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('10:00');
    setType('online');
    setPlatform('zoom');
    setCustomLink('');
    setAttendees([]);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSaveMeeting = async () => {
    if (!title || !date || !time) {
      alert('يرجى ملء الحقول الأساسية (العنوان، التاريخ، الوقت)');
      return;
    }
    
    const meetingData: Partial<Meeting> = {
      title, date, time, type,
      attendeesUids: attendees,
      notes,
      createdByUid: userProfile?.uid || '',
      createdAt: Date.now(),
      mentionsUids: []
    };

    if (type === 'online') {
      meetingData.platform = platform;
      meetingData.customLink = platform === 'custom' ? customLink : PLATFORM_LINKS[platform];
    } else {
      meetingData.region = region;
      meetingData.branch = branch;
      meetingData.room = room;
    }

    try {
      await addDoc(collection(db, 'meetings'), meetingData);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الاجتماع.');
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (confirm('هل أنت متأكد من إلغاء وحذف هذا الاجتماع؟')) {
      try {
        await deleteDoc(doc(db, 'meetings', id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getUserInfo = (uid: string) => users.find(u => u.uid === uid);

  const getBranchName = (regionName: string, branchId: string) => {
    const r = BRANCHES_DATA.find(x => x.rg === regionName);
    const b = r?.br.find(x => x.id === branchId);
    return b?.nm || '';
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">إدارة الاجتماعات والمؤتمرات</h2>
        <button onClick={openModal} className="bb flex items-center gap-2">
          <FaPlus /> اجتماع جديد
        </button>
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-16 text-gray-500">جاري مزامنة الاجتماعات...</div>
        ) : visibleMeetings.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FaVideo className="text-4xl mx-auto mb-3 opacity-50" />
            <p>لا توجد اجتماعات مجدولة حالياً</p>
          </div>
        ) : (
          visibleMeetings.map(meeting => (
            <div key={meeting.id} className="cd">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: meeting.type === 'online' ? '#22C55E' : '#3B82F6' }}></span>
                    <span className="font-semibold text-sm">{meeting.title}</span>
                  </div>
                  <div className="flex gap-3 text-[11px] mb-2" style={{ color: 'var(--tx2)' }}>
                    <span className="flex items-center gap-1"><FaCalendar /> {meeting.date}</span>
                    <span className="flex items-center gap-1"><FaClock /> {meeting.time}</span>
                  </div>
                  
                  {meeting.type === 'online' ? (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <FaGlobe /> {PLATFORMS[meeting.platform || 'zoom']}
                    </span>
                  ) : (
                    <span className="text-xs text-blue-400 flex items-center gap-1">
                      <FaMapMarkerAlt /> {meeting.region} - {getBranchName(meeting.region!, meeting.branch!)} - {meeting.room}
                    </span>
                  )}
                  
                  {meeting.notes && <p className="text-xs mt-2" style={{ color: 'var(--tx2)' }}>{meeting.notes}</p>}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-[10px]" style={{ color: 'var(--tx2)' }}>المنظم: {getUserInfo(meeting.createdByUid)?.name || 'مجهول'}</span>
                  
                  <div className="flex" style={{ gap: '2px' }}>
                    {meeting.attendeesUids?.slice(0, 4).map(uid => (
                      <div key={uid} title={getUserInfo(uid)?.name} style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(30,58,110,.5)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '8px', color: '#fff' }}>
                        {getUserInfo(uid)?.name?.[0] || '?'}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {meeting.type === 'online' && meeting.customLink && (
                      <a href={meeting.customLink} target="_blank" rel="noreferrer" className="bb" style={{ fontSize: '10px', padding: '4px 8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaExternalLinkAlt /> انضمام
                      </a>
                    )}
                    {(userProfile?.primaryRole === 'chairman' || userProfile?.primaryRole === 'vp' || userProfile?.uid === meeting.createdByUid) && (
                      <span onClick={() => handleDeleteMeeting(meeting.id)} className="text-[10px] text-red-400 hover:underline cursor-pointer">حذف الاجتماع</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="mo z-50">
          <div className="mc fi p-6 relative w-full max-w-lg">
            <div className="flex items-center justify-between mb-5 border-b border-[#1f1f1f] pb-3">
              <h3 className="text-lg font-bold">جدولة اجتماع جديد</h3>
              <FaTimes className="cursor-pointer text-gray-500 hover:text-white" onClick={() => setIsModalOpen(false)} />
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-2" style={{ maxHeight: '65vh' }}>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>عنوان الاجتماع</label>
                <input className="ip" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: مراجعة الميزانية الربع سنوية" />
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

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>نوع الاجتماع</label>
                <div className="flex gap-4 p-2 bg-[#111] border border-[#1f1f1f] rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="mTy" value="online" checked={type === 'online'} onChange={() => setType('online')} className="accent-[#8B1A1A]" />
                    <span className="text-sm">عن بُعد (Online)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="mTy" value="offline" checked={type === 'offline'} onChange={() => setType('offline')} className="accent-[#8B1A1A]" />
                    <span className="text-sm">حضوري (المقر)</span>
                  </label>
                </div>
              </div>

              {type === 'online' && (
                <div className="p-3 bg-[#111] border border-[#1f1f1f] rounded-lg">
                  <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>المنصة الرقمية</label>
                  <select className="ip mb-3" value={platform} onChange={e => setPlatform(e.target.value)}>
                    <option value="zoom">Zoom</option>
                    <option value="meet">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="webex">Cisco Webex</option>
                    <option value="custom">أخرى (رابط مخصص)</option>
                  </select>
                  {platform === 'custom' && (
                    <input className="ip" placeholder="أدخل رابط الاجتماع هنا..." value={customLink} onChange={e => setCustomLink(e.target.value)} />
                  )}
                </div>
              )}

              {type === 'offline' && (
                <div className="p-3 bg-[#111] border border-[#1f1f1f] rounded-lg flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>المنطقة</label>
                      <select className="ip" value={region} onChange={e => setRegion(e.target.value)}>
                        {BRANCHES_DATA.map(r => <option key={r.id} value={r.rg}>{r.rg}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>الفرع</label>
                      <select className="ip" value={branch} onChange={e => setBranch(e.target.value)}>
                        {BRANCHES_DATA.find(r => r.rg === region)?.br.map(b => <option key={b.id} value={b.id}>{b.nm}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>القاعة المتاحة</label>
                    <select className="ip" value={room} onChange={e => setRoom(e.target.value)}>
                      {BRANCHES_DATA.find(r => r.rg === region)?.br.find(b => b.id === branch)?.rm.map(rm => <option key={rm} value={rm}>{rm}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="relative">
                <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>المدعوون للاجتماع</label>
                <div className="p-2 min-h-[40px] bg-[#111] border border-[#1f1f1f] rounded-lg flex flex-wrap gap-2 items-center">
                  {attendees.map(uid => (
                    <span key={uid} className="fc">
                      {getUserInfo(uid)?.name || 'مجهول'}
                      <FaTimes className="cursor-pointer ml-1 text-gray-400 hover:text-red-500" onClick={() => setAttendees(attendees.filter(id => id !== uid))} />
                    </span>
                  ))}
                  <input 
                    className="bg-transparent border-none outline-none text-sm flex-1 min-w-[120px] text-white" 
                    placeholder="ابحث عن موظف..." 
                    value={attendeeQuery} 
                    onChange={e => { setAssigneeQuery(e.target.value); setShowAssigneeDrop(true); }}
                    onFocus={() => setShowAssigneeDrop(true)}
                  />
                </div>
                {showAssigneeDrop && attendeeQuery && (
                  <div className="md absolute w-full mt-1 z-10">
                    {users.filter(u => u.name.includes(attendeeQuery) && !attendees.includes(u.uid) && u.uid !== userProfile?.uid).map(u => (
                      <div key={u.uid} className="mi" onMouseDown={() => { setAttendees([...attendees, u.uid]); setAssigneeQuery(''); setShowAssigneeDrop(false); }}>
                        <FaUser className="text-[#3B82F6]" /> {u.name} ({u.department})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tx2)' }}>ملاحظات / أجندة الاجتماع</label>
                <textarea className="ip" rows={2} value={notes} onChange={e => setNotes(e.target.value)}></textarea>
              </div>

            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-[#1f1f1f]">
              <button type="button" onClick={handleSaveMeeting} className="bb flex-1">حفظ وتأكيد الجدولة</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg text-sm bg-[#111] text-gray-300 hover:bg-[#222]">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};