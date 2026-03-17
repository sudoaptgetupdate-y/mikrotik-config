import { useState, useEffect } from 'react';
import { Save, Bot, Loader2, Server, Cpu, MessageSquare, Power, RefreshCw } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function TabAISettings({ initialData }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const [settings, setSettings] = useState({
    AI_ENABLED: 'false',
    AI_OLLAMA_URL: 'http://localhost:11434',
    AI_OLLAMA_MODEL: 'qwen2.5:7b',
    AI_SYSTEM_PROMPT: ''
  });

  useEffect(() => {
    if (initialData) {
      setSettings({
        AI_ENABLED: String(initialData.AI_ENABLED || 'false'),
        AI_OLLAMA_URL: initialData.AI_OLLAMA_URL || 'http://localhost:11434',
        AI_OLLAMA_MODEL: initialData.AI_OLLAMA_MODEL || 'qwen2.5:7b',
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
      // บันทึกทีละตัวตามโครงสร้างเดิมของระบบ
      const keys = Object.keys(settings);
      const promises = keys.map(key => 
        apiClient.put(`/api/settings/${key}`, { value: JSON.stringify(settings[key]) })
      );

      await Promise.all(promises);
      toast.success('อัปเดตการตั้งค่า AI สำเร็จ!');
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
      // ทดสอบดึง Tags จาก Ollama Server
      const response = await fetch(`${settings.AI_OLLAMA_URL}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        const modelExists = models.some(m => m.name === settings.AI_OLLAMA_MODEL || m.name.startsWith(settings.AI_OLLAMA_MODEL));
        
        if (modelExists) {
          toast.success(`เชื่อมต่อสำเร็จ! พบ Model: ${settings.AI_OLLAMA_MODEL}`);
        } else {
          toast.error(`เชื่อมต่อสำเร็จ แต่ไม่พบ Model: ${settings.AI_OLLAMA_MODEL}`);
        }
      } else {
        throw new Error('Server returned error');
      }
    } catch (error) {
      toast.error('ไม่สามารถเชื่อมต่อกับ Ollama Server ได้');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bot size={20} className="text-blue-500" /> AI Assistant Settings
          </h3>
          <p className="text-sm text-slate-500 mt-1">ตั้งค่าการเชื่อมต่อ Ollama เพื่อใช้งานระบบช่วยเหลืออัจฉริยะใน Telegram</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={testConnection} 
            disabled={isTesting || !settings.AI_OLLAMA_URL}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            {isTesting ? <RefreshCw size={16} className="animate-spin"/> : <RefreshCw size={16} />} Test Connection
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
              <h4 className="font-bold text-slate-800">Enable AI Assistant</h4>
              <p className="text-sm text-slate-500">เปิดใช้งานระบบตอบโต้อัตโนมัติด้วย AI ใน Telegram Bot</p>
            </div>
          </div>
          <button
            onClick={() => handleChange('AI_ENABLED', settings.AI_ENABLED === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.AI_ENABLED === 'true' ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.AI_ENABLED === 'true' ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Server URL */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Server size={16} className="text-slate-400" /> Ollama Server URL
            </label>
            <input
              type="text"
              placeholder="http://192.168.x.x:11434"
              value={settings.AI_OLLAMA_URL}
              onChange={(e) => handleChange('AI_OLLAMA_URL', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm font-mono text-sm"
            />
            <p className="text-[11px] text-slate-400 italic">* โปรดตรวจสอบว่าได้ตั้งค่า OLLAMA_HOST=0.0.0.0 แล้ว</p>
          </div>

          {/* Model Name */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Cpu size={16} className="text-slate-400" /> Ollama Model Name
            </label>
            <input
              type="text"
              placeholder="e.g. qwen2.5:7b, llama3.1"
              value={settings.AI_OLLAMA_MODEL}
              onChange={(e) => handleChange('AI_OLLAMA_MODEL', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm font-mono text-sm"
            />
          </div>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <MessageSquare size={16} className="text-slate-400" /> AI System Prompt (Instruction)
          </label>
          <textarea
            rows={5}
            value={settings.AI_SYSTEM_PROMPT}
            onChange={(e) => handleChange('AI_SYSTEM_PROMPT', e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm text-sm resize-none"
            placeholder="ตั้งค่าบุคลิกภาพและคำสั่งเริ่มต้นให้ AI..."
          />
          <p className="text-xs text-slate-400 leading-relaxed">
            <b>Tip:</b> ควรกำหนดให้ AI ตอบสั้นๆ และเน้นภาษาไทย เพื่อลดภาระการประมวลผลของ CPU
          </p>
        </div>

        {/* Status Info */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <div className="flex gap-3">
            <div className="mt-0.5"><Bot size={18} className="text-blue-600" /></div>
            <div className="text-xs text-blue-700 leading-relaxed">
              <p className="font-bold mb-1">เกี่ยวกับ AI Assistant:</p>
              ระบบนี้จะใช้ Ollama เป็นสมองในการประมวลผล เมื่อผู้ใช้งานพิมพ์ข้อความที่ไม่มีคำสั่งใน Telegram ระบบจะส่งสถานะอุปกรณ์ทั้งหมดไปให้ AI ช่วยสรุปและตอบคำถามแบบธรรมชาติ (Natural Language)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
