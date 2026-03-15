import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Network } from 'lucide-react';
import ClientToSiteTab from './components/ClientToSiteTab';
import SiteToSiteTab from './components/SiteToSiteTab';

const VPNTools = () => {
  const [activeTab, setActiveTab] = useState('c2s');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck size={28} className="text-blue-600" />
            VPN Tools (WireGuard)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            เครื่องมือช่วยเจนสคริปต์ WireGuard VPN สำหรับ MikroTik RouterOS v7+
          </p>
        </div>
        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-10 -mt-10"></div>
      </div>

      {/* Tabs Selection */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto md:mx-0 shadow-inner">
        <button
          onClick={() => setActiveTab('c2s')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'c2s' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <UserPlus size={18} /> Client to Site
        </button>
        <button
          onClick={() => setActiveTab('s2s')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 's2s' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Network size={18} /> Site to Site
        </button>
      </div>

      {/* Content */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'c2s' ? <ClientToSiteTab /> : <SiteToSiteTab />}
      </div>
    </div>
  );
};

export default VPNTools;
