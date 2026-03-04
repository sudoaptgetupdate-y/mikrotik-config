import React from 'react';
import { Plus, Edit, X, Send, PlayCircle, CheckCircle } from 'lucide-react';

const GroupFormModal = ({ isOpen, onClose, isEditMode, formData, setFormData, onSubmit, onTestTelegram }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            {isEditMode ? <Edit size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />}
            {isEditMode ? 'แก้ไขข้อมูลกลุ่ม' : 'สร้างกลุ่มใหม่'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition"><X size={20} /></button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Group Details</h4>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อกลุ่ม (Group Name) *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="e.g. ลูกค้า A - สาขาเชียงใหม่" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">คำอธิบาย (Description)</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition min-h-[80px]" placeholder="รายละเอียดเพิ่มเติม..." />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อผู้ดูแลกลุ่ม</label>
                <input type="text" value={formData.adminName || ''} onChange={e => setFormData({...formData, adminName: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="เช่น ทีมงาน Network, คุณสมชาย" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">ช่องทางติดต่อ</label>
                <input type="text" value={formData.adminContact || ''} onChange={e => setFormData({...formData, adminContact: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="เบอร์โทรศัพท์ หรือ Line ID" />
              </div>
            </div>

            <div className="pt-5 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-black text-blue-500 uppercase tracking-wider flex items-center gap-1.5"><Send size={14}/> Telegram Notifications</h4>
                <label className="flex items-center cursor-pointer gap-2">
                  <span className="text-xs font-bold text-slate-600">เปิดแจ้งเตือน</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={formData.isNotifyEnabled} onChange={e => setFormData({...formData, isNotifyEnabled: e.target.checked})} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${formData.isNotifyEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isNotifyEnabled ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Bot Token</label>
                <input type="password" value={formData.telegramBotToken} onChange={e => setFormData({...formData, telegramBotToken: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Chat ID</label>
                <div className="flex gap-2">
                  <input type="text" value={formData.telegramChatId} onChange={e => setFormData({...formData, telegramChatId: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="-1001234567890 หรือ 123456789" />
                  <button type="button" onClick={onTestTelegram} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition flex items-center gap-1.5 shrink-0">
                    <PlayCircle size={16} /> ทดสอบ
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 transition text-sm font-bold">ยกเลิก</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-bold shadow-md shadow-blue-500/30 flex items-center gap-2">
              <CheckCircle size={18} /> {isEditMode ? 'บันทึกการแก้ไข' : 'สร้างกลุ่ม'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupFormModal;