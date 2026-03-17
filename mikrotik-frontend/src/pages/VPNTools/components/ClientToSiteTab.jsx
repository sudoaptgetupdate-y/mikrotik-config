import React, { useState } from 'react';
import { Terminal, Smartphone, Copy, RefreshCw, Download, Network } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Top Section: Config Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Card: Server & Network */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col h-full">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
            <Network size={20} className="text-blue-500" /> Server & Network Info
          </h3>
          
          <div className="space-y-5 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Public IP / DDNS</label>
                <input type="text" value={formData.serverPublicIp} onChange={e => setFormData({...formData, serverPublicIp: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm" placeholder="my.ddns.com หรือ 1.2.3.4" />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Listen Port</label>
                <div className="flex gap-2">
                  <input 
                      type="text" 
                      value={formData.listenPort} 
                      onChange={e => setFormData({...formData, listenPort: e.target.value.replace(/[^0-9]/g, '')})} 
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm" 
                      placeholder="51820" 
                  />
                  <button onClick={handleGeneratePort} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition flex items-center gap-2 shadow-sm">Gen</button>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl space-y-4 border border-slate-100">
               <label className="block text-xs font-black text-slate-600 uppercase">Existing Interface (MikroTik)</label>
               <div className="grid grid-cols-1 gap-4">
                  <div>
                     <label className="block text-[10px] font-bold text-slate-500 mb-1.5">WireGuard Interface Name</label>
                     <input type="text" value={formData.serverName} onChange={e => setFormData({...formData, serverName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-white shadow-sm" placeholder="เช่น wireguard1" />
                  </div>
                  <div>
                     <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Server Public Key</label>
                     <input type="text" value={formData.serverPublicKey} onChange={e => setFormData({...formData, serverPublicKey: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-xs font-mono bg-white shadow-sm" placeholder="คัดลอก Public Key จาก Server มาวาง" />
                  </div>
               </div>
            </div>

            <div className="pt-2">
               <label className="block text-xs font-black text-slate-400 uppercase mb-3">Traffic Routing (Allowed IPs)</label>
               <div className="grid grid-cols-3 gap-2 mb-4">
                  {['full', 'split', 'custom'].map((mode) => (
                    <button 
                      key={mode}
                      onClick={() => setFormData({...formData, routingMode: mode})}
                      className={`p-3 rounded-xl border text-[10px] font-bold transition-all capitalize ${formData.routingMode === mode ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      {mode === 'full' ? 'Full Tunnel' : mode === 'split' ? 'Split Tunnel' : 'Custom'}
                    </button>
                  ))}
               </div>
               
               {formData.routingMode === 'custom' && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
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
          </div>
        </div>

        {/* Right Card: Client Settings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col h-full">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
            <Smartphone size={20} className="text-blue-500" /> Client Device Setup
          </h3>

          <div className="space-y-5 flex-1">
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Client Name (Comment)</label>
                   <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm shadow-sm" placeholder="เช่น User-PC" />
                </div>
                <div>
                   <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">VPN Subnet</label>
                   <input 
                     type="text" 
                     value={formData.vpnSubnet} 
                     onChange={e => setFormData({...formData, vpnSubnet: e.target.value.replace(/\//g, '')})} 
                     className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono shadow-sm" 
                     placeholder="เช่น 10.0.88.0" 
                   />
                </div>
             </div>
             
             <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">DNS Server(s)</label>
                <input type="text" value={formData.dns} onChange={e => setFormData({...formData, dns: e.target.value})} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono shadow-sm" placeholder="8.8.8.8, 1.1.1.1" />
             </div>

             <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-4">
                <label className="block text-xs font-black text-blue-600 uppercase flex items-center gap-2">
                   Client Keys <span className="text-[10px] font-medium lowercase text-blue-400">(Generate for New Client)</span>
                </label>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input type="text" value={formData.clientPrivateKey} onChange={e => setFormData({...formData, clientPrivateKey: e.target.value})} className="flex-1 border border-blue-200 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none transition bg-white shadow-sm" placeholder="Client Private Key" />
                        <button onClick={() => handleGenerateKeys('client')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm flex items-center gap-1"><RefreshCw size={14} /> Gen</button>
                    </div>
                    <div className="space-y-1.5">
                       <label className="block text-[10px] font-bold text-slate-500">Client Public Key (Copy to MikroTik Peer)</label>
                       <input type="text" value={formData.clientPublicKey} onChange={e => setFormData({...formData, clientPublicKey: e.target.value})} className="w-full border border-blue-200 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none transition bg-white shadow-sm" placeholder="Client Public Key" />
                    </div>
                </div>
             </div>
          </div>

          <div className="pt-4">
             <button onClick={handleGenerateConfig} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:-translate-y-0.5 transition-all">
                Generate VPN Script
             </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Results */}
      <div className="space-y-6">
        {generatedConfig ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* RouterOS Result */}
            <div className="bg-slate-900 rounded-3xl p-6 shadow-xl space-y-4 h-full">
               <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h4 className="text-white font-bold flex items-center gap-2"><Terminal size={18} className="text-emerald-400" /> MikroTik Script</h4>
                  <button onClick={() => { navigator.clipboard.writeText(generatedConfig.serverScript); toast.success('Copied!'); }} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition shadow-sm"><Copy size={18} /></button>
               </div>
               <div className="relative">
                  <pre className="text-emerald-400 text-[11px] font-mono bg-slate-950/50 p-5 rounded-2xl overflow-x-auto min-h-[250px] max-h-[400px] border border-slate-800">
                     {generatedConfig.serverScript}
                  </pre>
               </div>
               <p className="text-[10px] text-slate-500 italic">คัดลอกสคริปต์นี้ไปวางใน Terminal ของ Winbox หรือ WebFig</p>
            </div>

            {/* Client Config Result */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 h-full flex flex-col">
               <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><div className="w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-sm"><Smartphone size={14} /></div> Client (.conf)</h4>
                  <div className="flex gap-2">
                    <button onClick={handleDownloadClientConfig} title="Download .conf" className="p-2 bg-slate-50 hover:bg-blue-50 rounded-xl transition text-slate-400 hover:text-blue-600 shadow-sm"><Download size={18} /></button>
                    <button onClick={() => { navigator.clipboard.writeText(generatedConfig.clientConfig); toast.success('Copied!'); }} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-slate-400 hover:text-slate-600 shadow-sm"><Copy size={18} /></button>
                  </div>
               </div>
               
               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="h-full">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Config Preview</label>
                    <pre className="text-[10px] text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 font-mono overflow-x-auto h-[200px]">
                        {generatedConfig.clientConfig}
                    </pre>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 h-full">
                     <div className="w-36 h-36 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-100 p-2">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatedConfig.clientConfig)}`} 
                          alt="QR Code" 
                          className="w-full h-full object-contain"
                        />
                     </div>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Scan with WireGuard App</span>
                     <p className="text-[9px] text-slate-400 mt-1">iOS / Android / Desktop</p>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-16 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 opacity-60">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 text-slate-200 shadow-sm border border-slate-100">
                <Smartphone size={48} />
             </div>
             <h4 className="font-bold text-slate-500 text-lg">ยังไม่มีข้อมูล Config</h4>
             <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">กรอกข้อมูลการตั้งค่า Server และ Client ด้านบน <br/> จากนั้นกดปุ่ม Generate เพื่อดูสคริปต์และ QR Code</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientToSiteTab;
