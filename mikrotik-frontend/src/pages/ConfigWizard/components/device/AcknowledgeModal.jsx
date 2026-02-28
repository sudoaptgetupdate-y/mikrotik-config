import { AlertTriangle, X, History, User, Clock, Loader2, CheckCircle } from 'lucide-react';

const AcknowledgeModal = ({ 
  isOpen, 
  onClose, 
  device, 
  ackReason, 
  setAckReason, 
  onSubmit, 
  isSubmitting 
}) => {
  if (!isOpen) return null;

  // Logic จัดการประวัติ
  let modalAckHistory = [];
  if (device?.ackReason) {
    if (Array.isArray(device.ackReason)) {
      modalAckHistory = device.ackReason;
    } else if (typeof device.ackReason === 'string') {
      try {
        modalAckHistory = JSON.parse(device.ackReason);
        if (!Array.isArray(modalAckHistory)) modalAckHistory = [];
      } catch (e) {
        modalAckHistory = [{ timestamp: device.ackAt || new Date(), reason: device.ackReason }];
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={20} />
            Acknowledge Warning
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={24} />
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Device: <span className="text-blue-600">{device?.name}</span>
            </label>
            <p className="text-xs text-slate-500">กรุณาระบุสาเหตุหรือหมายเหตุสำหรับการรับทราบการแจ้งเตือนนี้</p>
          </div>
          
          <textarea
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition"
            rows="3"
            placeholder="เช่น อุปกรณ์กำลังรัน Backup ทำให้ CPU ทำงานหนัก..."
            value={ackReason}
            onChange={(e) => setAckReason(e.target.value)}
          ></textarea>

          {/* ประวัติการ Acknowledge เดิม */}
          {modalAckHistory && modalAckHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                <History size={14} /> Previous Acknowledges
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                {modalAckHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <User size={12} className="text-blue-500"/> {h.userName || "Unknown"}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1 font-medium">
                        <Clock size={12}/> {new Date(h.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">{h.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition">
            Cancel
          </button>
          <button 
            onClick={onSubmit}
            disabled={isSubmitting || !ackReason.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold flex items-center gap-2 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-sm"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            Save Acknowledge
          </button>
        </div>

      </div>
    </div>
  );
};

export default AcknowledgeModal;