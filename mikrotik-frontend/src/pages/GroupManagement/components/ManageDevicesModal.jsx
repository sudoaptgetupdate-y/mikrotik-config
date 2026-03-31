import React, { useState, useMemo, useEffect, Fragment } from 'react';
import { MonitorSmartphone, X, Search, ArrowRightLeft, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';

const ManageDevicesModal = ({ isOpen, onClose, group, allDevices, loadingDevices, onSave }) => {
  const { t } = useTranslation();
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [originalAssignedIds, setOriginalAssignedIds] = useState([]);
  const [draftAssignedIds, setDraftAssignedIds] = useState([]);
  
  const [availablePage, setAvailablePage] = useState(1);
  const [assignedPage, setAssignedPage] = useState(1);
  const itemsPerModalPage = 5;

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen && group && allDevices) {
      const initialIds = allDevices.filter(d => d.groups?.some(g => g.id === group.id)).map(d => d.id);
      setOriginalAssignedIds(initialIds);
      setDraftAssignedIds(initialIds);
      setDeviceSearchQuery("");
      setAvailablePage(1);
      setAssignedPage(1);
    }
  }, [isOpen, group, allDevices]);

  const searchedDevices = useMemo(() => {
    return allDevices.filter(d => 
      d.name.toLowerCase().includes(deviceSearchQuery.toLowerCase()) || 
      (d.circuitId && d.circuitId.toLowerCase().includes(deviceSearchQuery.toLowerCase()))
    );
  }, [allDevices, deviceSearchQuery]);

  const availableDevices = useMemo(() => {
    return searchedDevices.filter(d => !draftAssignedIds.includes(d.id)).sort((a, b) => b.id - a.id); 
  }, [searchedDevices, draftAssignedIds]);

  const assignedDevices = useMemo(() => {
    return searchedDevices.filter(d => draftAssignedIds.includes(d.id)).sort((a, b) => b.id - a.id); 
  }, [searchedDevices, draftAssignedIds]);

  const paginatedAvailable = availableDevices.slice((availablePage - 1) * itemsPerModalPage, availablePage * itemsPerModalPage);
  const totalAvailablePages = Math.ceil(availableDevices.length / itemsPerModalPage) || 1;

  const paginatedAssigned = assignedDevices.slice((assignedPage - 1) * itemsPerModalPage, assignedPage * itemsPerModalPage);
  const totalAssignedPages = Math.ceil(assignedDevices.length / itemsPerModalPage) || 1;

  useEffect(() => {
    setAvailablePage(1);
    setAssignedPage(1);
  }, [deviceSearchQuery]);

  useEffect(() => {
    if (availablePage > totalAvailablePages) setAvailablePage(Math.max(1, totalAvailablePages));
    if (assignedPage > totalAssignedPages) setAssignedPage(Math.max(1, totalAssignedPages));
  }, [totalAvailablePages, totalAssignedPages]);

  const toggleDraftDevice = (deviceId, action) => {
    if (action === 'add') setDraftAssignedIds(prev => [...prev, deviceId]);
    else if (action === 'remove') setDraftAssignedIds(prev => prev.filter(id => id !== deviceId));
  };

  const handleSave = () => {
    onSave(group.id, draftAssignedIds, originalAssignedIds);
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-5xl flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-start shrink-0">
                  <div>
                    <Dialog.Title as="h3" className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <MonitorSmartphone className="text-blue-600" /> {t('groups.manage.title')} <span className="text-blue-600">{group?.name}</span>
                    </Dialog.Title>
                    <p className="text-sm text-slate-500 mt-1">{t('groups.manage.desc')}</p>
                  </div>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition"><X size={20} /></button>
                </div>

                <div className="p-4 border-b border-slate-100 shrink-0 bg-white">
                   <div className="relative max-w-md mx-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder={t('groups.manage.search_placeholder')} value={deviceSearchQuery} onChange={(e) => setDeviceSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition text-sm bg-slate-50" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto md:overflow-hidden p-4 sm:p-6 bg-slate-50/50">
                  {loadingDevices ? (
                    <div className="text-center py-20 text-slate-400 text-sm">{t('groups.manage.loading')}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 h-auto md:h-full">
                      {/* ฝั่งซ้าย: อุปกรณ์อื่นๆ */}
                      <div className="flex flex-col h-[400px] md:h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-sm text-slate-700 flex justify-between items-center shrink-0">
                          <span>{t('groups.manage.others_title')}</span>
                          <span className="bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md text-xs">{availableDevices.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                          {paginatedAvailable.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl m-2">{t('groups.manage.empty_available')}</div>
                          ) : (
                            paginatedAvailable.map(device => (
                              <div key={device.id} className="group flex items-center justify-between p-3 rounded-xl border bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all">
                                <div className="flex-1 min-w-0 pr-2">
                                  <p className="font-bold text-sm text-slate-700 truncate">{device.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 truncate">IP: {device.currentIp} {device.circuitId && `| CID: ${device.circuitId}`}</p>
                                </div>
                                <button onClick={() => toggleDraftDevice(device.id, 'add')} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 opacity-0 md:opacity-100 group-hover:opacity-100 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5">
                                  {t('groups.manage.add')} <ArrowRightLeft size={12} className="hidden md:block" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        {totalAvailablePages > 1 && (
                          <div className="p-2 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                            <button onClick={() => setAvailablePage(p => Math.max(1, p - 1))} disabled={availablePage === 1} className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <span className="text-xs font-bold text-slate-500">{t('groups.manage.page', { current: availablePage, total: totalAvailablePages })}</span>
                            <button onClick={() => setAvailablePage(p => Math.min(totalAvailablePages, p + 1))} disabled={availablePage === totalAvailablePages} className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={16} /></button>
                          </div>
                        )}
                      </div>

                      {/* ฝั่งขวา: อยู่ในกลุ่ม */}
                      <div className="flex flex-col h-[400px] md:h-full bg-white border border-blue-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-blue-50">
                        <div className="p-3 bg-blue-50 border-b border-blue-100 font-bold text-sm text-blue-800 flex justify-between items-center shrink-0">
                          <span>{t('groups.manage.members_title')}</span>
                          <span className="bg-white border border-blue-200 text-blue-600 px-2 py-0.5 rounded-md text-xs">{assignedDevices.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                          {paginatedAssigned.length === 0 ? (
                            <div className="text-center py-10 text-blue-300 text-sm border border-dashed border-blue-100 bg-blue-50/50 rounded-xl m-2">{t('groups.manage.empty_assigned')}</div>
                          ) : (
                            paginatedAssigned.map(device => (
                              <div key={device.id} className="group flex items-center justify-between p-3 rounded-xl border bg-white border-slate-200 hover:border-red-300 hover:shadow-sm transition-all">
                                <div className="flex-1 min-w-0 pr-2">
                                  <p className="font-bold text-sm text-slate-800 truncate">{device.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 truncate">IP: {device.currentIp} {device.circuitId && `| CID: ${device.circuitId}`}</p>
                                </div>
                                <button onClick={() => toggleDraftDevice(device.id, 'remove')} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 bg-red-50 opacity-0 md:opacity-100 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5">
                                  {t('groups.manage.remove')} <X size={12} className="hidden md:block" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        {totalAssignedPages > 1 && (
                          <div className="p-2 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                            <button onClick={() => setAssignedPage(p => Math.max(1, p - 1))} disabled={assignedPage === 1} className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <span className="text-xs font-bold text-slate-500">{t('groups.manage.page', { current: assignedPage, total: totalAssignedPages })}</span>
                            <button onClick={() => setAssignedPage(p => Math.min(totalAssignedPages, p + 1))} disabled={assignedPage === totalAssignedPages} className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={16} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:px-6 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
                   <button onClick={onClose} className="px-5 py-2 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition">{t('common.cancel')}</button>
                   <button onClick={handleSave} className="px-8 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20 flex items-center gap-2">
                     <Save size={18} /> {t('common.save_changes')}
                   </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ManageDevicesModal;