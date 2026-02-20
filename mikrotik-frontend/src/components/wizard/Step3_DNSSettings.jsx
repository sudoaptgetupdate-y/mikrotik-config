import React from 'react';
import { Globe, Plus, Trash2, ShieldCheck, ShieldAlert, Server } from 'lucide-react';

const Step3_DNSSettings = ({ dnsConfig, setDnsConfig }) => {
  
  // ฟังก์ชันสลับค่า Allow Remote Requests
  const toggleAllowRemote = () => {
    setDnsConfig(prev => ({
      ...prev,
      allowRemoteRequests: !prev.allowRemoteRequests
    }));
  };

  const addDnsServer = () => {
    setDnsConfig(prev => ({
      ...prev,
      servers: [...prev.servers, '']
    }));
  };

  const removeDnsServer = (index) => {
    if (dnsConfig.servers.length === 1) return;
    const newServers = dnsConfig.servers.filter((_, i) => i !== index);
    setDnsConfig(prev => ({ ...prev, servers: newServers }));
  };

  const updateDnsServer = (index, value) => {
    // อนุญาตให้พิมพ์เฉพาะตัวเลข 0-9 และเครื่องหมายจุด (.) เท่านั้น
    if (/^[0-9.]*$/.test(value)) {
      const newServers = [...dnsConfig.servers];
      newServers[index] = value;
      setDnsConfig(prev => ({ ...prev, servers: newServers }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Globe className="text-blue-600" /> DNS Server Settings
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">ตั้งค่าตัวแปลชื่อโดเมนสำหรับ MikroTik และอุปกรณ์ในเครือข่าย</p>
        </div>
        <button 
          onClick={addDnsServer}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 font-bold text-sm"
        >
          <Plus size={18} /> Add DNS Server
        </button>
      </div>

      {/* --- Main Content --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DNS Servers List */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <Server size={18} className="text-slate-400" /> Upstream DNS
            </h3>
          </div>
          
          <div className="space-y-4">
            {dnsConfig.servers.map((server, index) => (
              <div key={index} className="flex gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative flex-grow">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300 font-mono"
                    placeholder="e.g. 8.8.8.8"
                    value={server}
                    onChange={(e) => updateDnsServer(index, e.target.value)}
                  />
                </div>
                {dnsConfig.servers.length > 1 && (
                  <button 
                    onClick={() => removeDnsServer(index)} 
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                    title="Remove this DNS"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Remote Requests Toggle Box */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
              <ShieldCheck size={18} className="text-slate-400" /> DNS Cache Setup
            </h3>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex flex-col">
                <label className="font-bold text-slate-700 text-sm">Allow Remote Requests</label>
                <span className="text-xs text-slate-500 font-medium mt-0.5">เปิดใช้งาน DNS Caching</span>
              </div>
              
              {/* Modern Toggle Switch */}
              <button 
                type="button"
                onClick={toggleAllowRemote}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${dnsConfig.allowRemoteRequests ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${dnsConfig.allowRemoteRequests ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="text-sm space-y-3">
              {dnsConfig.allowRemoteRequests ? (
                <div className="p-4 bg-green-50/80 text-green-700 rounded-xl border border-green-200 animate-in fade-in zoom-in-95 duration-200">
                  <p className="font-bold flex items-center gap-2 text-green-800 mb-1">
                    <ShieldCheck size={16}/> Mode: DNS Server (Enabled)
                  </p>
                  <p className="text-xs font-medium leading-relaxed opacity-90">
                    MikroTik จะทำหน้าที่เป็น DNS Server ให้กับ Client ในวง LAN ช่วยเพิ่มความเร็วในการเข้าเว็บที่เคยเข้าแล้ว (Caching)
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-100/80 text-slate-600 rounded-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                  <p className="font-bold flex items-center gap-2 text-slate-700 mb-1">
                    <ShieldAlert size={16}/> Mode: Forwarder (Disabled)
                  </p>
                  <p className="text-xs font-medium leading-relaxed opacity-90">
                    DHCP จะแจก IP ของ Upstream DNS ให้ Client โดยตรง (เช่น แจก IP ของ Google/Cloudflare ให้เครื่องลูกข่าย)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Step3_DNSSettings;