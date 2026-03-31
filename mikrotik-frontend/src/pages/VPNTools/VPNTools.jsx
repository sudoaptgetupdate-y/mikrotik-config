import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ClientToSiteTab from './components/ClientToSiteTab';
import SiteToSiteTab from './components/SiteToSiteTab';

const VPNTools = ({ isModal = false }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('c2s');

  return (
    <div className={`w-full space-y-6 animate-in fade-in duration-500 pb-10 ${!isModal ? 'max-w-5xl mx-auto' : ''}`}>
      {/* Header - Only show if not in modal (Modal has its own header) */}
      {!isModal && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
              <ShieldCheck size={32} className="text-blue-600" />
              {t('vpn.title')}
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium italic">
              {t('vpn.subtitle')}
            </p>
          </div>
          <div className="absolute right-0 top-0 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-700"></div>
        </div>
      )}

      {/* Main Container */}
      <div className={`bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05),0_10px_20px_-10px_rgba(0,0,0,0.02)] border-0 sm:border border-slate-100 overflow-hidden pb-10 ${isModal ? 'rounded-3xl' : 'sm:rounded-3xl'}`}>
        
        {/* Tabs Selection */}
        <div className="bg-slate-50/50 border-b border-slate-100 p-4 sm:p-6 flex justify-center sm:justify-start">
          <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-full sm:w-fit shadow-inner">
            <button
              onClick={() => setActiveTab('c2s')}
              className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'c2s' ? 'bg-white text-blue-600 shadow-lg scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <UserPlus size={16} /> {t('vpn.tabs.c2s')}
            </button>
            <button
              onClick={() => setActiveTab('s2s')}
              className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 's2s' ? 'bg-white text-blue-600 shadow-lg scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Network size={16} /> {t('vpn.tabs.s2s')}
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-8 min-h-[500px]">
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'c2s' ? <ClientToSiteTab /> : <SiteToSiteTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VPNTools;
