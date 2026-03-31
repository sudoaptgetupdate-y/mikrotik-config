import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Plus, Edit, X, Send, PlayCircle, CheckCircle, Bot, Key, MessageSquare, Power, RefreshCw, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../../utils/apiClient';
import toast from 'react-hot-toast';

const GroupFormModal = ({ isOpen, onClose, isEditMode, formData, setFormData, onSubmit, onTestTelegram, manualMessage, setManualMessage, onSendManualMessage }) => {
  const { t } = useTranslation();
  const [isTestingAI, setIsTestingAI] = useState(false);

  const handleTestAI = async () => {
    if (!formData.aiGeminiKey) return toast.error(t('groups.form.ai_key_missing'));
    setIsTestingAI(true);
    try {
      const response = await apiClient.post('/api/settings/test-ai', { 
        apiKey: formData.aiGeminiKey 
      });
      if (response.data.success) {
        toast.success(response.data.message);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || t('groups.form.ai_test_error');
      toast.error(errorMsg);
    } finally {
      setIsTestingAI(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                  <Dialog.Title as="h3" className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    {isEditMode ? <Edit size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />}
                    {isEditMode ? t('groups.form.edit_title') : t('groups.form.create_title')}
                  </Dialog.Title>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition"><X size={20} /></button>
                </div>
                
                <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto bg-slate-50/30">
                    {/* 1. Group Details (Full Width) */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-slate-300 rounded-full"></div>
                        {t('groups.form.section_info')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('groups.form.label_name')} *</label>
                          <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-slate-50/50" placeholder={t('groups.form.placeholder_name')} />
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('groups.form.label_admin')}</label>
                          <input type="text" value={formData.adminName || ''} onChange={e => setFormData({...formData, adminName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition bg-slate-50/50" placeholder={t('groups.form.placeholder_admin')} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('groups.form.label_description')}</label>
                        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition min-h-[60px] resize-none bg-slate-50/50" placeholder={t('groups.form.placeholder_description')} />
                      </div>
                    </div>

                    {/* 2 & 3: Dual Column for Telegram and AI */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Left Side: Telegram Settings */}
                      <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm shadow-blue-500/5 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-blue-50 rounded-full opacity-50 -z-0"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider flex items-center gap-2">
                              <div className="p-1.5 bg-blue-100 rounded-lg"><Send size={14}/></div>
                              {t('groups.form.section_telegram')}
                            </h4>
                            <label className="flex items-center cursor-pointer gap-2">
                              <span className="text-xs font-bold text-slate-500">{formData.isNotifyEnabled ? t('groups.form.status_enabled') : t('groups.form.status_disabled')}</span>
                              <div className="relative">
                                <input type="checkbox" className="sr-only" checked={formData.isNotifyEnabled} onChange={e => setFormData({...formData, isNotifyEnabled: e.target.checked})} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.isNotifyEnabled ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isNotifyEnabled ? 'transform translate-x-4' : ''}`}></div>
                              </div>
                            </label>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">{t('groups.form.bot_token')}</label>
                              <input type="password" value={formData.telegramBotToken} onChange={e => setFormData({...formData, telegramBotToken: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="123456...:ABC..." />
                            </div>
                            
                            <div>
                              <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">{t('groups.form.chat_id')}</label>
                              <div className="flex gap-2">
                                <input type="text" value={formData.telegramChatId} onChange={e => setFormData({...formData, telegramChatId: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="-100..." />
                                <button type="button" onClick={onTestTelegram} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0 border border-blue-200">
                                  <PlayCircle size={14} /> {t('groups.form.test_button')}
                                </button>
                              </div>
                            </div>

                            {isEditMode && formData.telegramBotToken && formData.telegramChatId && (
                              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <label className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                                  <MessageSquare size={14} className="text-blue-500" /> {t('groups.form.send_manual')}
                                </label>
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    value={manualMessage} 
                                    onChange={e => setManualMessage(e.target.value)} 
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 outline-none transition" 
                                    placeholder={t('groups.form.placeholder_manual')} 
                                  />
                                  <button 
                                    type="button" 
                                    onClick={onSendManualMessage}
                                    disabled={!manualMessage.trim()}
                                    className={`p-2 rounded-xl transition shrink-0 ${manualMessage.trim() ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-400'}`}
                                  >
                                    <Send size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: AI Settings */}
                      <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm shadow-emerald-500/5 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-emerald-50 rounded-full opacity-50 -z-0"></div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                              <div className="p-1.5 bg-emerald-100 rounded-lg"><Bot size={14}/></div>
                              {t('groups.form.section_ai')}
                            </h4>
                            <label className="flex items-center cursor-pointer gap-2">
                              <span className="text-xs font-bold text-slate-500">{formData.aiEnabled ? t('groups.form.status_enabled') : t('groups.form.status_disabled')}</span>
                              <div className="relative">
                                <input type="checkbox" className="sr-only" checked={formData.aiEnabled} onChange={e => setFormData({...formData, aiEnabled: e.target.checked})} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${formData.aiEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.aiEnabled ? 'transform translate-x-4' : ''}`}></div>
                              </div>
                            </label>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-black text-slate-400 uppercase">{t('groups.form.label_ai_key')}</label>
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 font-bold">{t('groups.form.get_key')} <ExternalLink size={10} /></a>
                              </div>
                              <div className="flex gap-2">
                                <input type="password" value={formData.aiGeminiKey || ''} onChange={e => setFormData({...formData, aiGeminiKey: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition" placeholder="AIzaSy..." />
                                <button type="button" onClick={handleTestAI} disabled={isTestingAI || !formData.aiGeminiKey} className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0 disabled:opacity-50">
                                  {isTestingAI ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} {t('groups.form.test_button')}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">{t('groups.form.label_ai_prompt')}</label>
                              <textarea value={formData.aiSystemPrompt || ''} onChange={e => setFormData({...formData, aiSystemPrompt: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition min-h-[110px] resize-none" placeholder={t('groups.form.placeholder_ai_prompt')} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-3xl">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition text-sm font-bold">{t('common.cancel')}</button>
                    <button type="submit" className="px-8 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-black transition text-sm font-bold shadow-lg shadow-slate-200 flex items-center gap-2">
                      <CheckCircle size={18} /> {isEditMode ? t('common.save_changes') : t('groups.form.create_title')}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default GroupFormModal;