import React, { useEffect, useState } from 'react';
import { Plus, Edit, X, Send, PlayCircle, CheckCircle, Bot, Key, MessageSquare, Power, RefreshCw, ExternalLink } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import toast from 'react-hot-toast';

const GroupFormModal = ({ isOpen, onClose, isEditMode, formData, setFormData, onSubmit, onTestTelegram, manualMessage, setManualMessage, onSendManualMessage }) => {
  const [isTestingAI, setIsTestingAI] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleTestAI = async () => {
    if (!formData.aiGeminiKey) return toast.error('กรุณากรอก API Key ก่อนทดสอบ');
    setIsTestingAI(true);
    try {
      const response = await apiClient.post('/api/settings/test-ai', { 
        apiKey: formData.aiGeminiKey 
      });
      if (response.data.success) {
        toast.success(response.data.message);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'ไม่สามารถเชื่อมต่อกับ Gemini AI ได้';
      toast.error(errorMsg);
    } finally {
      setIsTestingAI(false);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 pointer-events-none invisible'
      }`}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div 
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10 transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            {isEditMode ? <Edit size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />}
            {isEditMode ? 'แก้ไขข้อมูลกลุ่ม' : 'สร้างกลุ่มใหม่'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition"><X size={20} /></button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div className="p-5 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* 1. Group Details */}
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

            {/* 2. Telegram Settings */}
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

              {isEditMode && formData.telegramBotToken && formData.telegramChatId && (
                <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                    <Send size={14} /> ส่งข้อความประกาศ (Manual Message)
                  </label>
                  <div className="space-y-2">
                    <textarea 
                      value={manualMessage} 
                      onChange={e => setManualMessage(e.target.value)} 
                      className="w-full border border-blue-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-500 outline-none transition min-h-[60px]" 
                      placeholder="พิมพ์ข้อความที่ต้องการส่งหาคนในกลุ่มนี้..." 
                    />
                    <button 
                      type="button" 
                      onClick={onSendManualMessage}
                      disabled={!manualMessage.trim()}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${manualMessage.trim() ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      <Send size={16} /> ส่งข้อความไปยังกลุ่ม
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. AI Settings (NEW) */}
            <div className="pt-5 border-t border-slate-100 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1.5"><Bot size={14}/> Gemini AI Assistant</h4>
                <label className="flex items-center cursor-pointer gap-2">
                  <span className="text-xs font-bold text-slate-600">เปิดใช้งาน AI</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={formData.aiEnabled} onChange={e => setFormData({...formData, aiEnabled: e.target.checked})} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${formData.aiEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.aiEnabled ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-bold text-slate-700">Gemini API Key</label>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">รับ Key ฟรี <ExternalLink size={10} /></a>
                  </div>
                  <div className="flex gap-2">
                    <input type="password" value={formData.aiGeminiKey || ''} onChange={e => setFormData({...formData, aiGeminiKey: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition" placeholder="AIzaSy..." />
                    <button type="button" onClick={handleTestAI} disabled={isTestingAI || !formData.aiGeminiKey} className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-sm rounded-xl transition flex items-center gap-1.5 shrink-0 disabled:opacity-50">
                      {isTestingAI ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />} ทดสอบ
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">System Instruction (บทบาท AI)</label>
                  <textarea value={formData.aiSystemPrompt || ''} onChange={e => setFormData({...formData, aiSystemPrompt: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition min-h-[100px] resize-none" placeholder="เช่น: คุณคือผู้ช่วยดูแลระบบ Network ของกลุ่มนี้ ตอบคำถามอย่างสุภาพและเป็นมืออาชีพ..." />
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
