import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Smartphone, Copy, Download, Network, Globe, Hash, Cpu, Zap, Activity, Settings2, ShieldCheck, ArrowRightLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateWireguardKeyPair } from '../../../utils/wireguardGenerator';
import { logService } from '../../../services/logService';

const ClientToSiteTab = () => {
  const resultsRef = useRef(null); // 🟢 Ref for auto-scroll
  
  const [formData, setFormData] = useState({
    serverName: '',
    serverPublicKey: '',
    serverPublicIp: '',
    listenPort: '',
    clientName: '',
    clientPrivateKey: '',
    clientPublicKey: '',
    vpnSubnet: '',
    dns: '8.8.8.8',
    routingMode: 'full', // 'full', 'split', 'custom'
    customAllowedIPs: ''
  });

  const [generatedConfig, setGeneratedConfig] = useState(null);

  // 🟢 Auto-generate random port on mount
  useEffect(() => {
    const randomPort = Math.floor(Math.random() * (65000 - 10000 + 1)) + 10000;
    setFormData(prev => ({...prev, listenPort: randomPort.toString()}));
  }, []);

  const handleGenerateKeys = (target) => {
    const { privateKey, publicKey } = generateWireguardKeyPair();
    if (target === 'server') {
        setFormData({...formData, serverPrivateKey: privateKey, serverPublicKey: publicKey});
    } else {
        setFormData({...formData, clientPrivateKey: privateKey, clientPublicKey: publicKey});
        toast.success('Generated Client Keys Successfully');
    }
  };

  const handleGeneratePort = () => {
    const randomPort = Math.floor(Math.random() * (65000 - 10000 + 1)) + 10000;
    setFormData(prev => ({...prev, listenPort: randomPort.toString()}));
    toast.success(`Generated Port: ${randomPort}`);
  };

  const handleGenerateConfig = () => {
    if (!formData.clientPublicKey || !formData.serverPublicIp || !formData.vpnSubnet) {
        return toast.error('กรุณากรอกข้อมูลที่จำเป็น (Client Key, Public IP, VPN Subnet)');
    }

    const port = formData.listenPort || '51820';
    const cleanSubnet = formData.vpnSubnet.includes('/') ? formData.vpnSubnet.split('/')[0] : formData.vpnSubnet;
    const clientVpnIp = cleanSubnet.replace(/\.[0-9]+$/, '.2');

    const serverScript = `# --- Server Config: Add Client to WireGuard ---
/interface wireguard peers
add allowed-address=${clientVpnIp}/32 interface=${formData.serverName || 'wireguard1'} public-key="${formData.clientPublicKey}" comment="${formData.clientName || 'VPN-Client'}"`;

    let allowedIPs = '0.0.0.0/0';
    if (formData.routingMode === 'split') {
        allowedIPs = `${cleanSubnet}/24`;
    } else if (formData.routingMode === 'custom') {
        allowedIPs = formData.customAllowedIPs || '0.0.0.0/0';
    }

    const clientConfig = `[Interface]
PrivateKey = ${formData.clientPrivateKey || '(Insert Client Private Key)'}
Address = ${clientVpnIp}/24
DNS = ${formData.dns || '8.8.8.8'}

[Peer]
PublicKey = ${formData.serverPublicKey || '(Paste Server Public Key Here)'}
AllowedIPs = ${allowedIPs}
Endpoint = ${formData.serverPublicIp}:${port}
PersistentKeepalive = 25`;

    setGeneratedConfig({ serverScript, clientConfig });
    logService.createActivityLog('GENERATE_VPN', `Client-to-Site VPN: ${formData.clientName || 'N/A'}`);
    toast.success('Generated Successfully!');

    // 🟢 Auto-scroll to results
    setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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

  const StatusPill = ({ active, onClick, icon: Icon, label, activeClass, inactiveClass }) => (
  <button 
      onClick={onClick}
      className={`flex items-center justify-center h-10 px-4 rounded-xl border transition-all duration-300 font-bold text-[11px] uppercase tracking-wider ${
          active ? activeClass : inactiveClass
      }`}
  >
      <Icon size={14} className={active ? "opacity-100" : "opacity-60"} />
      <span className="ml-2 whitespace-nowrap">{label}</span>
  </button>
  );

  const isGenerateDisabled = !formData.serverPublicIp || !formData.vpnSubnet || !formData.clientPublicKey;

  return (
  <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4 sm:px-0">

    {/* --- 1. Header Section (Internal) --- */}
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sticky top-4 z-40">
        <div className="flex items-center gap-3 ml-2">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Smartphone size={22} />
            </div>
            <div>
                <h2 className="text-lg font-black text-slate-800 leading-none tracking-tight">Client-to-Site VPN Configuration</h2>
                <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">Mobile & Remote Access Setup</p>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            {/* Port Input */}
            <div className="flex items-center gap-2 bg-slate-50 pl-3 pr-1 py-1.5 rounded-xl border border-slate-200 shadow-inner">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Listen Port:</span>
                <input 
                    type="text" 
                    value={formData.listenPort} 
                    onChange={e => setFormData({...formData, listenPort: e.target.value.replace(/[^0-9]/g, '')})} 
                    className="bg-transparent text-sm font-bold text-blue-600 w-16 outline-none text-center"
                    placeholder="51820"
                />
                <button onClick={handleGeneratePort} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all"><Zap size={14} /></button>
            </div>

            {/* Generate Action */}
            <button 
                onClick={handleGenerateConfig} 
                disabled={isGenerateDisabled}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                    isGenerateDisabled 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                    : 'bg-slate-900 text-white shadow-lg hover:bg-black hover:-translate-y-0.5 active:translate-y-0'
                }`}
            >
                <Terminal size={14} />
                Generate Script
            </button>
        </div>
    </div>
      {/* --- 2. Configuration Cards --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Card: Server & Network */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 hover:border-blue-200 transition-colors duration-300">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-5">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner"><Globe size={20}/></div>
              <span className="font-black text-slate-800 uppercase tracking-tight text-base">Server Configuration</span>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Public IP / DDNS Hostname</label>
                <input type="text" value={formData.serverPublicIp} onChange={e => setFormData({...formData, serverPublicIp: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300" placeholder="hq.yourdomain.com" />
            </div>

            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><ShieldCheck size={14}/> MikroTik WireGuard Hub</label>
               <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                     <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Interface Name</label>
                     <input type="text" value={formData.serverName} onChange={e => setFormData({...formData, serverName: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:border-blue-400 outline-none transition-all" placeholder="wireguard1" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Server Public Key</label>
                     <input type="text" value={formData.serverPublicKey} onChange={e => setFormData({...formData, serverPublicKey: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:border-blue-400 outline-none transition-all" placeholder="Paste Public Key from MikroTik" />
                  </div>
               </div>
            </div>

            <div className="space-y-4 pt-2">
               <label className="block text-[11px] font-bold text-blue-600 uppercase tracking-wider ml-1">Traffic Routing Mode</label>
               <div className="flex flex-wrap gap-2">
                  <StatusPill 
                    active={formData.routingMode === 'full'}
                    onClick={() => setFormData({...formData, routingMode: 'full'})}
                    icon={Globe}
                    label="Full Tunnel"
                    activeClass="bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                    inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-blue-300"
                  />
                  <StatusPill 
                    active={formData.routingMode === 'split'}
                    onClick={() => setFormData({...formData, routingMode: 'split'})}
                    icon={Network}
                    label="Split Tunnel"
                    activeClass="bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                    inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-blue-300"
                  />
                  <StatusPill 
                    active={formData.routingMode === 'custom'}
                    onClick={() => setFormData({...formData, routingMode: 'custom'})}
                    icon={Settings2}
                    label="Custom"
                    activeClass="bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                    inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-blue-300"
                  />
               </div>
               
               {formData.routingMode === 'custom' && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                     <input 
                       type="text" 
                       value={formData.customAllowedIPs} 
                       onChange={e => setFormData({...formData, customAllowedIPs: e.target.value})} 
                       className="w-full border border-blue-200 rounded-xl p-3 text-xs font-bold text-blue-700 bg-blue-50/30 focus:ring-4 focus:ring-blue-50 outline-none transition-all" 
                       placeholder="เช่น 192.168.1.0/24, 10.0.88.0/24" 
                     />
                  </div>
               )}
            </div>
          </div>
        </div>

        {/* Right Card: Client Setup */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 hover:border-emerald-200 transition-colors duration-300">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-5">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner"><Cpu size={20}/></div>
              <span className="font-black text-slate-800 uppercase tracking-tight text-base">Client Device Settings</span>
          </div>

          <div className="space-y-5">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                   <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Friendly Name</label>
                   <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all placeholder:text-slate-300" placeholder="e.g. CEO-iPhone" />
                </div>
                <div className="space-y-2">
                   <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">VPN Virtual IP</label>
                   <input type="text" value={formData.vpnSubnet} onChange={e => setFormData({...formData, vpnSubnet: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all" placeholder="10.88.0.2" />
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">DNS Server (Optional)</label>
                <input type="text" value={formData.dns} onChange={e => setFormData({...formData, dns: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all" placeholder="8.8.8.8, 1.1.1.1" />
             </div>

             <div className="p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 space-y-4 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 leading-none">Client Keypair</label>
                    <button onClick={() => handleGenerateKeys('client')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-700 transition-all shadow-md"><RefreshCw size={12} /> Generate New</button>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-emerald-500 uppercase ml-1">Private Key (Keep Secret)</label>
                        <input type="text" value={formData.clientPrivateKey} onChange={e => setFormData({...formData, clientPrivateKey: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-xs font-mono shadow-sm focus:border-emerald-400 outline-none transition-all" placeholder="Client Private Key" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="block text-[10px] font-bold text-emerald-500 uppercase ml-1">Public Key (For MikroTik)</label>
                       <input type="text" value={formData.clientPublicKey} onChange={e => setFormData({...formData, clientPublicKey: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-xs font-mono shadow-sm focus:border-emerald-400 outline-none transition-all" placeholder="Copy to Peer configuration" />
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* --- 3. Results Section --- */}
      <div ref={resultsRef} className="pt-4 h-1" />
      
      {generatedConfig ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
          {/* MikroTik Result */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl space-y-4 border border-slate-800 relative group">
             <div className="absolute top-6 right-6">
                <button onClick={() => { navigator.clipboard.writeText(generatedConfig.serverScript); toast.success('Copied!'); }} className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-blue-600 transition-all flex items-center justify-center border border-white/5"><Copy size={18} /></button>
             </div>
             <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center"><Terminal size={16} /></div>
                <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Server Script (Paste to MikroTik)</h4>
             </div>
             <div className="bg-black/40 rounded-2xl p-6 border border-white/5 shadow-inner">
                <pre className="text-emerald-400 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px] scrollbar-hide">
                   {generatedConfig.serverScript}
                </pre>
             </div>
          </div>

          {/* Client Result */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 h-full flex flex-col">
             <div className="flex justify-between items-center border-b border-slate-50 pb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner"><Smartphone size={20} /></div>
                    <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-tight text-sm">Client Configuration</h4>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">WireGuard Config (.conf)</p>
                    </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDownloadClientConfig} title="Download .conf" className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center border border-slate-100 shadow-sm"><Download size={18} /></button>
                  <button onClick={() => { navigator.clipboard.writeText(generatedConfig.clientConfig); toast.success('Copied!'); }} className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center border border-slate-100 shadow-sm"><Copy size={18} /></button>
                </div>
             </div>
             
             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-full">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Config Preview</label>
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 h-[220px] shadow-inner overflow-hidden">
                    <pre className="text-[10px] text-slate-600 font-mono leading-relaxed h-full overflow-y-auto scrollbar-hide">
                        {generatedConfig.clientConfig}
                    </pre>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 h-full shadow-inner group">
                   <div className="w-40 h-40 bg-white rounded-2xl flex items-center justify-center mb-5 shadow-lg border border-slate-100 p-3 group-hover:scale-105 transition-transform duration-500">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatedConfig.clientConfig)}`} 
                        alt="QR Code" 
                        className="w-full h-full object-contain"
                      />
                   </div>
                   <div className="text-center">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Scan to Connect</span>
                       <p className="text-[9px] text-slate-400 mt-1 font-medium italic">Compatible with WireGuard App</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 opacity-60">
           <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-6 text-slate-200 shadow-sm border border-slate-100">
              <Activity size={48} />
           </div>
           <h4 className="font-bold text-slate-500 text-xl tracking-tight">Ready to Generate</h4>
           <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed font-medium">กรอกข้อมูล Server และ Client ด้านบนให้ครบถ้วน <br/>จากนั้นกดปุ่ม Generate ใน Header เพื่อสร้างไฟล์ Config และ QR Code</p>
        </div>
      )}
    </div>
  );
};

export default ClientToSiteTab;