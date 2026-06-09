import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { Modal } from '../components/Modal'; // استيراد المكون الجديد

export const TasksPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false); // هذا هو "مفتاح" فتح النافذة

  return (
    <div>
      <button 
        onClick={() => setIsModalOpen(true)} // عند الضغط، نفتح النافذة
        className="bg-[#8B1A1A] text-white px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FaPlus /> مهمة جديدة
      </button>

      {/* نافذة المهمة */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة مهمة جديدة">
        <form className="space-y-4">
          <input className="w-full bg-[#111] p-2 rounded" placeholder="عنوان المهمة" />
          <textarea className="w-full bg-[#111] p-2 rounded" placeholder="وصف المهمة" />
          <button type="button" className="w-full bg-[#8B1A1A] p-2 rounded">حفظ المهمة</button>
        </form>
      </Modal>
    </div>
  );
};