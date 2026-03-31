import React, { Fragment } from 'react';
import { Edit, Plus, X, Mail, User, Shield, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

const UserFormModal = ({ 
  isOpen, 
  onClose, 
  isEditing, 
  formData, 
  handleInputChange, 
  handleSubmit, 
  generatedUsername, 
  passwordRules 
}) => {
  const { t } = useTranslation();

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
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isEditing ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                      {isEditing ? <Edit size={20} /> : <Plus size={20} />}
                    </div>
                    <Dialog.Title as="h3" className="font-bold text-slate-800 text-lg tracking-tight">
                      {isEditing ? t('users.form.edit_title') : t('users.form.add_title')}
                    </Dialog.Title>
                  </div>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">{t('users.form.first_name')} *</label><input required type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder={t('users.form.first_name_placeholder')} /></div>
                      <div><label className="block text-xs font-bold text-slate-700 mb-1">{t('users.form.last_name')} *</label><input required type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder={t('users.form.last_name_placeholder')} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t('users.form.email')} *</label>
                        <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required disabled={isEditing} type="email" name="email" value={formData.email} onChange={handleInputChange} className={`w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100 ${isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} placeholder="example@domain.com" /></div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t('users.form.username')}</label>
                        <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input disabled type="text" value={generatedUsername} className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm bg-slate-50 text-slate-500" placeholder={t('users.form.username_placeholder')} /></div>
                        {!isEditing && <p className="text-[10px] text-slate-400 mt-1">{t('users.form.username_hint')}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t('users.form.role')} *</label>
                        <div className="relative">
                          <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select name="role" value={formData.role} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100 bg-white font-medium text-slate-700">
                            <option value="SUPER_ADMIN">{t('users.roles.super_admin_desc')}</option>
                            <option value="ADMIN">{t('users.roles.admin_desc')}</option>
                            <option value="EMPLOYEE">{t('users.roles.employee_desc')}</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t('users.form.status')}</label>
                        <div className="flex items-center h-[42px] px-3 border border-slate-200 rounded-lg bg-slate-50/50">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              name="isActive" 
                              checked={formData.isActive} 
                              onChange={handleInputChange} 
                              className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            <span className={`ml-3 text-sm font-bold ${formData.isActive ? 'text-green-600' : 'text-slate-500'}`}>
                              {formData.isActive ? t('users.status.active').toUpperCase() : t('users.status.inactive').toUpperCase()}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-4 sm:pt-5">
                      <label className="block text-xs font-bold text-slate-700 mb-1">{isEditing ? t('users.form.password_edit_label') : t('users.form.password_label')}</label>
                      <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required={!isEditing} type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder="••••••••" /></div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('users.form.confirm_password')} *</label>
                      <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required={!isEditing || formData.password} type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder="••••••••" /></div>
                      {(!isEditing || formData.password.length > 0) && (
                        <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-600 mb-2">{t('users.form.password_rules_header')}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {passwordRules.map(rule => {
                              const isPass = rule.regex.test(formData.password);
                              return (
                                <div key={rule.id} className={`flex items-center gap-1.5 text-[11px] font-medium ${isPass ? 'text-green-600' : 'text-slate-400'}`}>
                                  {isPass ? <CheckCircle2 size={14} className="shrink-0" /> : <XCircle size={14} className="shrink-0" />}
                                  {rule.label}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-slate-50 shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 sm:border-transparent text-slate-600 hover:bg-slate-200 transition text-sm font-medium w-full sm:w-auto text-center">{t('common.cancel')}</button>
                    <button type="submit" className="px-5 py-2.5 sm:py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-bold shadow-sm w-full sm:w-auto text-center">{isEditing ? t('common.save_changes') : t('users.form.create_button')}</button>
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

export default UserFormModal;