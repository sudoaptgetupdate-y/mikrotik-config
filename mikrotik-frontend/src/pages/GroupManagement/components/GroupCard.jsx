import React from 'react';
import { Edit, Trash2, Send, Bell, BellOff, ShieldAlert, MonitorSmartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GroupCard = ({ group, onEdit, onDelete, onManageDevices }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-all hover:shadow-md flex flex-col group/card">
      <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
        <div className="flex-1 pr-4">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 flex-wrap">
            <span className="truncate">{group.name}</span>
            {/* 🟢 เพิ่มป้าย Default ถ้าเป็นกลุ่ม All Devices */}
            {group.name === 'All Devices' && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
                {t('groups.card.default')}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{group.description || t('groups.card.no_description')}</p>
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover/card:opacity-100 transition-opacity">
          <button onClick={() => onEdit(group)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title={t('groups.card.edit_tooltip')}><Edit size={16} /></button>
          
          {/* 🟢 ซ่อนปุ่มลบ ถ้าเป็นกลุ่ม All Devices */}
          {group.name !== 'All Devices' && (
            <button onClick={() => onDelete(group)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title={t('groups.card.delete_tooltip')}><Trash2 size={16} /></button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4 flex-1">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-slate-600 flex items-center gap-1.5"><Send size={16} className={group.telegramBotToken ? "text-blue-500" : "text-slate-300"} /> {t('groups.card.telegram')}</span>
            {group.isNotifyEnabled ? 
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider"><Bell size={12}/> {t('groups.card.active')}</span> : 
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider"><BellOff size={12}/> {t('groups.card.muted')}</span>
            }
          </div>
          {group.telegramChatId ? (
            <div className="text-xs font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 break-all">{t('groups.form.chat_id')}: {group.telegramChatId}</div>
          ) : (
            <div className="text-xs text-orange-500 bg-orange-50 p-2 rounded-lg font-medium flex items-center gap-1"><ShieldAlert size={14} /> {t('groups.card.no_telegram')}</div>
          )}
        </div>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-100">
        <button onClick={() => onManageDevices(group)} className="w-full py-2.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
          <MonitorSmartphone size={16} /> {t('groups.card.manage_devices', { count: group._count?.devices || 0 })}
        </button>
      </div>
    </div>
  );
};

export default GroupCard;