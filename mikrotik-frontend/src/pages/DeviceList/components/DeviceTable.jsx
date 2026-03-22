import { Loader2, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DeviceTableRow from './DeviceTableRow';
import { getDeviceStatus } from './deviceHelpers';

const DeviceTable = ({ 
  loading, 
  devices, 
  handlers, 
  canEdit,
  pageSizes,
  itemsPerPage,
  setItemsPerPage,
  from,
  to,
  total,
  thresholds 
}) => {
  const { t } = useTranslation();

  if (loading && devices.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-white">
        <Loader2 size={36} className="animate-spin text-blue-600 mb-4" />
        <p className="font-medium text-sm">{t('devices.table.loading')}</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center text-center p-8">
        <div className="bg-slate-50 p-5 rounded-full mb-4">
          <Activity size={48} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-1">{t('devices.table.noDataTitle')}</h3>
        <p className="text-slate-500 text-sm max-w-sm">
          {t('devices.table.noDataText')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full"> 
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold text-left">
              <th className="p-4 pl-6 w-[15%] whitespace-nowrap">{t('devices.table.colStatus')}</th>
              <th className="p-4 w-[25%] whitespace-nowrap">{t('devices.table.colDetails')}</th>
              <th className="p-4 w-[20%] whitespace-nowrap">{t('devices.table.colResources')}</th>
              <th className="p-4 w-[25%] whitespace-nowrap">{t('devices.table.colHealth')}</th>
              <th className="p-4 text-right pr-6 w-[15%] whitespace-nowrap">{t('devices.table.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {devices.map((device) => (
              <DeviceTableRow 
                key={device.id} 
                device={device}
                status={getDeviceStatus(device, thresholds, t)} 
                thresholds={thresholds} 
                canEdit={canEdit}
                {...handlers}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs mt-auto w-full">
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 bg-white sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-200 sm:border-transparent shadow-sm sm:shadow-none">
          <span className="text-slate-500 font-medium whitespace-nowrap">{t('devices.table.itemsPerPage')}</span>
          <div className="flex flex-wrap justify-end gap-1">
            {pageSizes?.map(size => (
              <button 
                key={size} 
                onClick={() => setItemsPerPage(size)} 
                className={`px-2.5 py-1.5 sm:py-1 rounded transition-colors font-bold ${itemsPerPage === size ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div className="text-slate-500 font-medium text-center sm:text-right w-full sm:w-auto bg-white sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-200 sm:border-transparent shadow-sm sm:shadow-none">
          {t('devices.table.showing')} <span className="font-bold text-slate-700">{from}</span> {t('devices.table.to')} <span className="font-bold text-slate-700">{to}</span> {t('devices.table.from', 'of')} <span className="font-bold text-slate-700">{total}</span> {t('devices.table.records')}
        </div>
      </div>
    </div>
  );
};

export default DeviceTable;