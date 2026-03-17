import { useState, useEffect } from 'react';
import { Save, Bot, Loader2, Key, MessageSquare, Power, RefreshCw, ExternalLink } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function TabAISettings({ initialData }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const [settings, setSettings] = useState({
    AI_ENABLED: 'false',
    AI_GEMINI_KEY: '',
    AI_SYSTEM_PROMPT: ''
  });

  useEffect(() => {
    if (initialData) {
      setSettings({
        AI_ENABLED: String(initialData.AI_ENABLED || 'false'),
        AI_GEMINI_KEY: initialData.AI_GEMINI_KEY || '',
        AI_SYSTEM_PROMPT: initialData.AI_SYSTEM_PROMPT || ''
      });
    }
  }, [initialData]);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const keys = Object.keys(settings);
      const promises = keys.map(key => 
        apiClient.put(`/api/settings/${key}`, { value: settings[key] })
      );

      await Promise.all(promises);
      toast.success('อัปเดตการตั้งค่า Gemini AI สำเร็จ!');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await apiClient.post('/api/settings/test-ai', { 
        apiKey: settings.AI_GEMINI_KEY 
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'ไม่สามารถเชื่อมต่อกับ Gemini AI ได้';
      toast.error(errorMsg);
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bot size={20} className="text-emerald-500" /> Google Gemini AI Assistant
          </h3>
          <p className="text-sm text-slate-500 mt-1">ใช้พลังของ Gemini 1.5 Flash เพื่อช่วยสรุปและวิเคราะห์สถานะเครือข่าย</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={testConnection} 
            disabled={isTesting || !settings.AI_GEMINI_KEY}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            {isTesting ? <RefreshCw size={16} className="animate-spin"/> : <RefreshCw size={16} />} Test API Key
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save AI Settings
          </button>
        </div>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* Toggle Switch */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${settings.AI_ENABLED === 'true' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
              <Power size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">Enable Gemini AI</h4>
              <p className="text-sm text-slate-500">เปิดใช้งานระบบตอบโต้อัตโนมัติด้วย Gemini 1.5 Flash ใน Telegram</p>
            </div>
          </div>
          <button
            onClick={() => handleChange('AI_ENABLED', settings.AI_ENABLED === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.AI_ENABLED === 'true' ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.AI_ENABLED === 'true' ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Key size={16} className="text-slate-400" /> Google AI Studio API Key
            </label>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              รับ API Key ฟรี <ExternalLink size={12} />
            </a>
          </div>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={settings.AI_GEMINI_KEY}
            onChange={(e) => handleChange('AI_GEMINI_KEY', e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm font-mono text-sm"
          />
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <MessageSquare size={16} className="text-slate-400" /> AI System Instruction (Role)
          </label>
          <textarea
            rows={5}
            value={settings.AI_SYSTEM_PROMPT}
            onChange={(e) => handleChange('AI_SYSTEM_PROMPT', e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm text-sm resize-none"
            placeholder="เช่น: คุณคือผู้ช่วยดูแลระบบ Network ของ NT ตอบสั้นๆ..."
          />
        </div>

        {/* Gemini Info */}
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <div className="flex gap-3">
            <div className="mt-0.5"><Bot size={18} className="text-emerald-600" /></div>
            <div className="text-xs text-emerald-700 leading-relaxed">
              <p className="font-bold mb-1">ทำไมต้อง Gemini 1.5 Flash?</p>
              Gemini 1.5 Flash มีความฉลาดสูง เข้าใจภาษาไทยได้ดีเยี่ยม และประมวลผลได้รวดเร็วผ่าน Cloud ของ Google ช่วยให้บอทของคุณสามารถวิเคราะห์สถานะอุปกรณ์ที่ซับซ้อนได้แม่นยำกว่าการรัน Model ขนาดเล็กในเครื่อง
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
