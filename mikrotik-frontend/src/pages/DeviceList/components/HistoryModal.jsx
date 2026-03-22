import React, { useEffect } from 'react';
import { X, Download, Clock, FileText, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateMikrotikScript } from '../../../utils/mikrotikGenerator';
import { generateMikrotikScriptV6 } from '../../../utils/mikrotikGeneratorV6';
import Swal from 'sweetalert2'; 
import apiClient from '../../../utils/apiClient';

const HistoryModal = ({ isOpen, onClose, device, history, loading }) => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // ป้องกันการ scroll พื้นหลัง
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleDownload = async (configEntry) => { 
    // 🟢 1. ถามเวอร์ชัน
    const result = await Swal.fire({
      title: t('devices.history.downloadConfirmTitle', 'Download from History'),
      text: t('devices.history.downloadConfirmText', 'Which RouterOS version do you want to download this history for?'),
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: t('devices.history.rosV7', 'RouterOS v7'),
      denyButtonText: t('devices.history.rosV6', 'RouterOS v6'),
      cancelButtonText: t('common.cancel', 'Cancel'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-2xl p-5 border border-slate-100 shadow-xl',
        title: 'text-lg font-bold text-slate-800',
        actions: 'flex gap-2 mt-4 w-full justify-center',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all',
        denyButton: 'bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold transition-all'
      }
    });

    if (!result.isConfirmed && !result.isDenied) return;
    const isV6 = result.isDenied;

    try {
      await apiClient.post(`/api/devices/${device.id}/log-download`, {
         userId: 1, 
         configId: configEntry.id
      });

      const configData = typeof configEntry.inputData === 'string' 
        ? JSON.parse(configEntry.inputData) 
        : configEntry.inputData;

      // 🟢 2. เลือกว่าจะปั่นสคริปต์ด้วยตัวไหน
      const script = isV6 ? generateMikrotikScriptV6(configData) : generateMikrotikScript(configData);
      
      const element = document.createElement("a");
      const file = new Blob([script], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      const dateStr = new Date(configEntry.createdAt).toISOString().split('T')[0];
      // เติม v6 หรือ v7 ท้ายชื่อไฟล์ให้แยกออกง่ายๆ
      element.download = `${device.name}_${dateStr}_v${configEntry.id}_${isV6 ? 'v6' : 'v7'}.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
    } catch (e) {
      console.error("Download Error:", e);
      alert(t('devices.history.downloadError', 'Error generating script from history'));
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

      {/* Modal Container */}
      <div 
        className={`bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10 transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-800 tracking-tight">{t('devices.history.title', 'Config History')}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('devices.history.deviceName', 'Device:')} {device?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 bg-slate-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p>{t('devices.history.loading', 'Loading history records...')}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <FileText size={48} className="text-slate-300" />
              <p>{t('devices.history.noHistory', 'No history found for this device.')}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-white text-xs uppercase text-slate-500 font-semibold sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-4 border-b">{t('devices.history.colDate', 'Saved Date')}</th>
                  <th className="p-4 border-b">{t('devices.history.colModel', 'Model')}</th>
                  <th className="p-4 border-b">{t('devices.history.colUser', 'User')}</th>
                  <th className="p-4 border-b text-right">{t('devices.history.colActions', 'Restore / Download')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition group">
                    <td className="p-4 text-sm text-slate-700">
                      <div className="font-medium">
                        {new Date(item.createdAt).toLocaleDateString(i18n.language)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleTimeString(i18n.language)}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {item.deviceModel?.name || 'Unknown'}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {item.user?.username || `User #${item.userId}`}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDownload(item)}
                        className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <Download size={14} /> {t('devices.history.downloadButton', 'Download .rsc')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white text-right shrink-0">
            <button onClick={onClose} className="px-5 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition shadow-sm">
                {t('common.close', 'Close')}
            </button>
        </div>

      </div>
    </div>
  );
};

export default HistoryModal;