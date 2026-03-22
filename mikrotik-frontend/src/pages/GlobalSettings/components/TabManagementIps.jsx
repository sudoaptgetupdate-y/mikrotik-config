import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Loader2, Network, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import Pagination from '../../../components/Pagination';
import { useTranslation } from 'react-i18next';

export default function TabManagementIps({ initialData }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [managementIps, setManagementIps] = useState(initialData || []);
  const [newManagementIp, setNewManagementIp] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const totalPages = Math.ceil(managementIps.length / itemsPerPage) || 1;
  const paginatedIps = useMemo(() => {
    return managementIps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [managementIps, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages, currentPage]);

  const handleSaveToBackend = async (updatedList, onSuccess) => {
    setIsSaving(true);
    const savePromise = apiClient.put(`/api/settings/MANAGEMENT_IPS`, { value: updatedList });
    
    toast.promise(savePromise, {
      loading: t('common.saving') || 'กำลังบันทึกข้อมูล...',
      success: t('settings.management_ips.toast_success'),
      error: (err) => `${t('common.error')}: ${err.message}`
    });

    try {
      await savePromise;
      setManagementIps(updatedList);
      queryClient.invalidateQueries({ queryKey: ['settings'] }); 
      if (onSuccess) onSuccess();
    } catch (error) { console.error(error); } 
    finally { setIsSaving(false); }
  };

  const addManagementIp = () => {
    const cleanIp = newManagementIp.trim();
    if (!cleanIp) return toast.error(t('settings.management_ips.error_missing'));
    if (managementIps.includes(cleanIp)) return toast.error(t('settings.management_ips.error_duplicate', { name: cleanIp }));

    const updatedList = [...managementIps, cleanIp];
    handleSaveToBackend(updatedList, () => { 
      setNewManagementIp(''); 
      setCurrentPage(Math.ceil(updatedList.length / itemsPerPage));
    });
  };

  const removeManagementIp = async (index, ip) => {
    const realIndex = (currentPage - 1) * itemsPerPage + index;
    const result = await Swal.fire({
      title: t('settings.management_ips.delete_confirm.title'), 
      text: t('settings.management_ips.delete_confirm.text', { name: ip }), 
      icon: 'warning',
      showCancelButton: true, 
      confirmButtonText: t('settings.management_ips.delete_confirm.confirm'), 
      cancelButtonText: t('common.cancel'), 
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border border-slate-100 shadow-xl', title: 'text-xl font-bold text-slate-800',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-2', actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const updatedList = managementIps.filter((_, i) => i !== realIndex);
      handleSaveToBackend(updatedList);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="mb-6 pb-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-bold text-slate-800">{t('settings.management_ips.title')}</h3>
        <p className="text-sm text-slate-500 mt-1">{t('settings.management_ips.desc')}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-white p-4 border border-slate-200 rounded-xl shadow-sm shrink-0">
        <input type="text" placeholder={t('settings.management_ips.placeholder')} value={newManagementIp} onChange={e => setNewManagementIp(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManagementIp()} className="w-full sm:flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all" />
        <button onClick={addManagementIp} disabled={isSaving} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm whitespace-nowrap">
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} {t('settings.management_ips.add_button')}
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {paginatedIps.map((ip, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-emerald-300">
                <Network size={16} className="text-emerald-500 shrink-0" />
                <span className="flex-1 text-sm font-mono text-emerald-800">{ip}</span>
                <button onClick={() => removeManagementIp(idx, ip)} disabled={isSaving} className="text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {managementIps.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-300 rounded-xl bg-slate-50 mb-6">
              {t('settings.management_ips.empty')}
            </div>
          )}
        </div>

        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          setCurrentPage={setCurrentPage} 
          isSticky={false}
        />
      </div>
    </div>
  );
}