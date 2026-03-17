import React, { useState } from 'react';
import { Terminal, Smartphone, Copy, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateWireguardKeyPair } from '../../../utils/wireguardGenerator';
import { logService } from '../../../services/logService';

const ClientToSiteTab = () => {
  const [formData, setFormData] = useState({
    serverName: '',
    serverPrivateKey: '',
    serverPublicKey: '',
    serverPublicIp: '',
    listenPort: '',
    clientName: '',
    clientPrivateKey: '',
    clientPublicKey: '',
    vpnSubnet: '',
    dns: '',
    routingMode: 'full', // 'full', 'split', 'custom'
    customAllowedIPs: ''
  });

  const [generatedConfig, setGeneratedConfig] = useState(null);

  const handleGenerateKeys = (target) => {
    const { privateKey, publicKey } = generateWireguardKeyPair();
    if (target === 'server') {
        setFormData({...formData, serverPrivateKey: privateKey, serverPublicKey: publicKey});
        toast.success('เจน Server Keys สำเร็จ (ใช้สำหรับสร้าง Server ใหม่)');
    } else {
        setFormData({...formData, clientPrivateKey: privateKey, clientPublicKey: publicKey});
        toast.success('เจน Client Keys สำเร็จ');
    }
  };

  const handleGeneratePort = () => {
    const randomPort = Math.floor(Math.random() * (60000 - 10000 + 1)) + 10000;
    setFormData({...formData, listenPort: randomPort.toString()});
    toast.success(`Generated Port: ${randomPort}`);
  };

  const handleGenerateConfig = () => {
    if (!formData.clientPublicKey || !formData.serverPublicIp) {
        return toast.error('กรุณากรอกข้อมูลที่จำเป็น (Client Public Key และ Public IP)');
    }

    const port = formData.listenPort || '51820';
    const cleanSubnet = formData.vpnSubnet.split('/')[0]; // Safety check
    const clientVpnIp = cleanSubnet.replace(/\.0$/, '.2');

    const serverScript = `# --- Server Config: Add Peer to Existing Interface ---
/interface wireguard peers
add allowed-address=${clientVpnIp}/32 interface=${formData.serverName} public-key="${formData.clientPublicKey}" comment="${formData.clientName}"`;

    let allowedIPs = '0.0.0.0/0';
    if (formData.routingMode === 'split') {
        allowedIPs = `${cleanSubnet}/24`;
    } else if (formData.routingMode === 'custom') {
        allowedIPs = formData.customAllowedIPs || `${cleanSubnet}/24`;
    }

    const clientConfig = `[Interface]
PrivateKey = ${formData.clientPrivateKey || '(ใส่ Client Private Key ที่นี่)'}
Address = ${clientVpnIp}/24
DNS = ${formData.dns || '8.8.8.8'}

[Peer]
PublicKey = ${formData.serverPublicKey || '(คัดลอก Public Key จาก MikroTik มาวาง)'}
AllowedIPs = ${allowedIPs}
Endpoint = ${formData.serverPublicIp}:${port}`;

    setGeneratedConfig({ serverScript, clientConfig });
    
    // ✅ บันทึก Log การ Generate VPN
    logService.createActivityLog(
      'GENERATE_VPN', 
      `Generate สคริปต์ WireGuard (Client-to-Site) สำหรับ Client: ${formData.clientName || 'N/A'}`
    );

    toast.success('เจนสคริปต์สำเร็จ!');
  };

  const handleDownloadClientConfig = () => {
    if (!generatedConfig) return;
    const element = document.createElement("a");
    const file = new Blob([generatedConfig.clientConfig], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${formData.clientName || 'wireguard'}.conf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
          <Terminal size={20} className="text-blue-500" /> VPN Client Setup
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Public IP / DDNS</label>
              <input type="text" value={formData.serverPublicIp} onChange={e => setFormData({...formData, serverPublicIp: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="my.ddns.com หรือ 1.2.3.4" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Listen Port</label>
              <div className="flex gap-2">
                <input 
                    type="text" 
                    value={formData.listenPort} 
                    onChange={e => setFormData({...formData, listenPort: e.target.value.replace(/[^0-9]/g, '')})} 
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" 
                    placeholder="51820" 
                />
                <button onClick={handleGeneratePort} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition flex items-center gap-2 shadow-sm">Gen</button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
             <label className="block text-xs font-black text-slate-600 uppercase">Existing Server Info (From MikroTik)</label>
             <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="block text-[10px] font-bold text-slate-500 mb-1">Interface Name</label>
                   <input type="text" value={formData.serverName} onChange={e => setFormData({...formData, serverName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white" placeholder="เช่น wireguard1" />
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-slate-500 mb-1">Server Public Key</label>
                   <input type="text" value={formData.serverPublicKey} onChange={e => setFormData({...formData, serverPublicKey: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono bg-white" placeholder="Public Key ของ Server" />
                </div>
             </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
             <label className="block text-xs font-black text-slate-400 uppercase mb-3">Traffic Routing (Allowed IPs)</label>
             <div className="grid grid-cols-3 gap-2 mb-4">
                {['full', 'split', 'custom'].map((mode) => (
                  <button 
                    key={mode}
                    onClick={() => setFormData({...formData, routingMode: mode})}
                    className={`p-2.5 rounded-xl border text-[10px] font-bold transition-all capitalize ${formData.routingMode === mode ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {mode === 'full' ? 'Full Tunnel' : mode === 'split' ? 'Split Tunnel' : 'Custom'}
                  </button>
                ))}
             </div>
             
             {formData.routingMode === 'custom' && (
                <div className="mb-4 animate-in slide-in-from-top-2 duration-200">
                   <input 
                     type="text" 
                     value={formData.customAllowedIPs} 
                     onChange={e => setFormData({...formData, customAllowedIPs: e.target.value})} 
                     className="w-full border border-blue-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition bg-blue-50/30" 
                     placeholder="เช่น 192.168.1.0/24, 10.0.88.0/24" 
                   />
                </div>
             )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
             <label className="block text-xs font-black text-slate-400 uppercase mb-1">Client Information</label>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Client Name</label>
                   <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm" placeholder="User-1" />
                </div>
                <div>
                   <label className="block text-[11px] font-bold text-slate-500 mb-1.5">VPN Subnet</label>
                   <input 
                     type="text" 
                     value={formData.vpnSubnet} 
                     onChange={e => setFormData({...formData, vpnSubnet: e.target.value.replace(/\//g, '')})} 
                     className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono" 
                     placeholder="เช่น 10.0.88.0" 
                   />
                </div>
             </div>
             <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1.5">DNS Server(s)</label>
                <input type="text" value={formData.dns} onChange={e => setFormData({...formData, dns: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono" placeholder="เช่น 8.8.8.8, 1.1.1.1" />
             </div>
             <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-3">
                <label className="block text-xs font-black text-blue-600 uppercase">Client Keys (Generate for Client)</label>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input type="text" value={formData.clientPrivateKey} onChange={e => setFormData({...formData, clientPrivateKey: e.target.value})} className="flex-1 border border-blue-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition bg-white" placeholder="Client Private Key" />
                        <button onClick={() => handleGenerateKeys('client')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm flex items-center gap-1"><RefreshCw size={14} /> Gen Keys</button>
                    </div>
                    <input type="text" value={formData.clientPublicKey} onChange={e => setFormData({...formData, clientPublicKey: e.target.value})} className="w-full border border-blue-200 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition bg-white" placeholder="Client Public Key" />
                </div>
             </div>
          </div>

          <button onClick={handleGenerateConfig} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-0.5 transition-all">
             Generate WireGuard Script
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {generatedConfig ? (
          <>
            <div className="bg-slate-900 rounded-3xl p-6 shadow-xl space-y-4">
               <div className="flex justify-between items-center">
                  <h4 className="text-white font-bold flex items-center gap-2"><Terminal size={18} className="text-emerald-400" /> RouterOS Script</h4>
                  <button onClick={() => { navigator.clipboard.writeText(generatedConfig.serverScript); toast.success('Copied!'); }} className="text-slate-400 hover:text-white transition"><Copy size={18} /></button>
               </div>
               <pre className="text-emerald-400 text-xs font-mono bg-slate-800/50 p-4 rounded-xl overflow-x-auto max-h-[300px]">
                  {generatedConfig.serverScript}
               </pre>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
               <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><div className="w-5 h-5 bg-blue-500 text-white rounded flex items-center justify-center"><Smartphone size={14} /></div> Client Config (.conf)</h4>
                  <div className="flex gap-2">
                    <button onClick={handleDownloadClientConfig} title="Download .conf" className="p-2 hover:bg-slate-50 rounded-lg transition text-slate-400 hover:text-blue-600"><Download size={18} /></button>
                    <button onClick={() => { navigator.clipboard.writeText(generatedConfig.clientConfig); toast.success('Copied!'); }} className="p-2 hover:bg-slate-50 rounded-lg transition text-slate-400 hover:text-slate-600"><Copy size={18} /></button>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <pre className="text-[10px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono overflow-x-auto">
                        {generatedConfig.clientConfig}
                    </pre>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                     <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center mb-3 shadow-inner">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatedConfig.clientConfig)}`} 
                          alt="QR Code" 
                          className="w-28 h-28"
                        />
                     </div>
                     <span className="text-[10px] font-bold text-slate-500">Scan via WireGuard App</span>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 opacity-60">
             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <Smartphone size={40} />
             </div>
             <h4 className="font-bold text-slate-400">ยังไม่มีข้อมูล Config</h4>
             <p className="text-xs text-slate-400 mt-2 max-w-xs">กรอกข้อมูลฝั่งซ้ายและกดปุ่ม Generate เพื่อสร้างสคริปต์สำหรับ MikroTik และ Client</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientToSiteTab;
