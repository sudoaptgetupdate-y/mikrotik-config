import React from 'react';
import { X, Download, Clock, FileText, Loader2 } from 'lucide-react';
import { generateMikrotikScript } from '../utils/mikrotikGenerator';

const HistoryModal = ({ isOpen, onClose, device, history, loading }) => {
  if (!isOpen) return null;

  const handleDownload = (configEntry) => {
    try {
      // Parse JSON กลับมาเป็น Object
      const configData = typeof configEntry.inputData === 'string' 
        ? JSON.parse(configEntry.inputData) 
        : configEntry.inputData;

      const script = generateMikrotikScript(configData);
      
      const element = document.createElement("a");
      const file = new Blob([script], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      // ตั้งชื่อไฟล์ตามวันที่
      const dateStr = new Date(configEntry.createdAt).toISOString().split('T')[0];
      element.download = `${device.name}_${dateStr}_v${configEntry.id}.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
    } catch (e) {
      console.error("Download Error:", e);
      alert("Error generating script from history");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden m-4 flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Clock size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Config History</h3>
              <p className="text-xs text-slate-400">Device: {device?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 bg-slate-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p>Loading history records...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <FileText size={48} className="text-slate-300" />
              <p>No history found for this device.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-white text-xs uppercase text-slate-500 font-semibold sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-4 border-b">Saved Date</th>
                  <th className="p-4 border-b">Model</th>
                  <th className="p-4 border-b">User</th>
                  <th className="p-4 border-b text-right">Restore / Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition group">
                    <td className="p-4 text-sm text-slate-700">
                      <div className="font-medium">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleTimeString()}
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
                        <Download size={14} /> Download .rsc
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
                Close Window
            </button>
        </div>

      </div>
    </div>
  );
};

export default HistoryModal;