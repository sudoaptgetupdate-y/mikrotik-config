import React from 'react';
import { Globe, Plus, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';

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
    const newServers = [...dnsConfig.servers];
    newServers[index] = value;
    setDnsConfig(prev => ({ ...prev, servers: newServers }));
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Globe className="text-blue-600" /> DNS Server Settings
        </h2>
        <p className="text-sm text-slate-500 mt-1">ตั้งค่าตัวแปลชื่อโดเมนสำหรับ MikroTik และอุปกรณ์ในเครือข่าย</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-bold text-slate-700">Upstream DNS Servers</label>
            <button 
              onClick={addDnsServer}
              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 font-bold flex items-center gap-1"
            >
              <Plus size={14} /> Add IP
            </button>
          </div>
          
          <div className="space-y-2">
            {dnsConfig.servers.map((server, index) => (
              <div key={index} className="flex gap-2">
                <input 
                  type="text"
                  className="flex-grow p-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 8.8.8.8"
                  value={server}
                  onChange={(e) => updateDnsServer(index, e.target.value)}
                />
                {dnsConfig.servers.length > 1 && (
                  <button onClick={() => removeDnsServer(index)} className="p-2 text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ส่วนที่ติ๊กเปิด/ปิด */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className={dnsConfig.allowRemoteRequests ? "text-green-600" : "text-slate-400"} />
              <label className="font-bold text-slate-700">Allow Remote Requests</label>
            </div>
            {/* ปรับเป็น Button เพื่อให้กดง่ายขึ้น */}
            <button 
              type="button"
              onClick={toggleAllowRemote}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors outline-none focus:ring-2 focus:ring-blue-300 ${dnsConfig.allowRemoteRequests ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${dnsConfig.allowRemoteRequests ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="text-xs space-y-3">
            {dnsConfig.allowRemoteRequests ? (
              <div className="p-3 bg-green-100/50 text-green-700 rounded-lg border border-green-200">
                <p className="font-bold flex items-center gap-1"><ShieldCheck size={14}/> Mode: DNS Server (Enabled)</p>
                <p className="mt-1">MikroTik จะทำตัวเป็น DNS Server ให้กับ Client ในวง LAN</p>
              </div>
            ) : (
              <div className="p-3 bg-slate-200/50 text-slate-600 rounded-lg border border-slate-300">
                <p className="font-bold flex items-center gap-1"><ShieldAlert size={14}/> Mode: Forwarder (Disabled)</p>
                <p className="mt-1">DHCP จะแจก IP DNS ของ Google/Cloudflare ให้ Client โดยตรง</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3_DNSSettings;