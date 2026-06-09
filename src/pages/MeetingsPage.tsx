import React, { useState } from 'react';
import { FaPlus, FaCalendar, FaClock, FaVideo, FaMapMarkerAlt, FaExternalLinkAlt, FaTrash } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

export const MeetingsPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([
    {
      id: 'm1', title: 'اجتماع الإدارة العليا الدوري', date: '2026-06-12', time: '16:00',
      type: 'online', platform: 'zoom', customLink: 'https://zoom.us/join',
      createdByName: 'م/ محمد أبو نواف', createdByRole: 'رئيس مجلس الإدارة'
    }
  ]);

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">إدارة الاجتماعات والمؤتمرات</h2>
        <button className="bg-gradient-to-r from-[#8B1A1A] to-[#A52A2A] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
          <FaPlus /> اجتماع جديد
        </button>
      </div>

      <div className="grid gap-4">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="bg-[#151515] border border-[#1f1f1f] rounded-xl p-5 hover:border-[#8B1A1A] transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${meeting.type === 'online' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                  <span className="font-bold text-base">{meeting.title}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-2">
                  <span className="flex items-center gap-1"><FaCalendar /> {meeting.date}</span>
                  <span className="flex items-center gap-1"><FaClock /> {meeting.time}</span>
                </div>
                {meeting.type === 'online' ? (
                  <span className="text-xs text-green-400 flex items-center gap-1"><FaVideo /> عن بُعد - {meeting.platform}</span>
                ) : (
                  <span className="text-xs text-blue-400 flex items-center gap-1"><FaMapMarkerAlt /> حضوري - {meeting.location}</span>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-gray-500">{meeting.createdByName} ({meeting.createdByRole})</span>
                <div className="flex gap-2">
                  {meeting.type === 'online' && (
                    <a href={meeting.customLink} target="_blank" rel="noreferrer" className="bg-gradient-to-r from-[#8B1A1A] to-[#A52A2A] text-white text-xs px-3 py-1.5 rounded font-bold flex items-center gap-1">
                      <FaExternalLinkAlt /> انضمام
                    </a>
                  )}
                  {(userProfile?.primaryRole === 'chairman' || userProfile?.primaryRole === 'vp') && (
                    <button className="text-red-500 bg-red-500/10 hover:bg-red-500/20 p-2 rounded text-xs" title="حذف الاجتماع">
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};