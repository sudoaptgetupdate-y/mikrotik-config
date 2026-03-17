import React, { useState } from 'react';
import { Terminal, Copy, RefreshCw, Download, Network, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateWireguardKeyPair } from '../../../utils/wireguardGenerator';
import { logService } from '../../../services/logService';

const SiteToSiteTab = () => {
    const [setupMode, setSetupMode] = useState('new'); // 'new' or 'add-branch'
    const [routingMode, setRoutingMode] = useState('split'); // 'split' or 'custom'
    
    const [formData, setFormData] = useState({
      listenPort: '51820',
      sideA: { name: '', privateKey: '', publicKey: '', address: '', lan: '', endpoint: '', customAllowedIPs: '' },
      sideB: { name: '', privateKey: '', publicKey: '', address: '', lan: '', endpoint: '', customAllowedIPs: '' }
    });
  
    const [generatedResult, setGeneratedResult] = useState(null);
  
    const handleGenerateKey = (side) => {
        const { privateKey, publicKey } = generateWireguardKeyPair();
        if (side === 'A') {
            setFormData(prev => ({...prev, sideA: {...prev.sideA, privateKey: privateKey, publicKey: publicKey}}));
        } else {
            setFormData(prev => ({...prev, sideB: {...prev.sideB, privateKey: privateKey, publicKey: publicKey}}));
        }
        toast.success(`Generated keys for Side ${side}`);
    };

    const handleGeneratePort = () => {
        const randomPort = Math.floor(Math.random() * (60000 - 10000 + 1)) + 10000;
        setFormData(prev => ({...prev, listenPort: randomPort.toString()}));
        toast.success(`Generated Port: ${randomPort}`);
    };
  
    const handleGenerate = () => {
        const { sideA, sideB, listenPort } = formData;
        if (!sideA.publicKey || !sideB.publicKey || !sideA.privateKey || !sideB.privateKey) {
            return toast.error('กรุณากรอก Private/Public Key ของทั้งสองฝั่ง');
        }

        // Determine Allowed IPs based on Routing Mode
        const allowedIPsForA = routingMode === 'split' ? `${sideB.address},${sideB.lan}` : sideA.customAllowedIPs || sideB.lan;
        const allowedIPsForB = routingMode === 'split' ? `${sideA.address},${sideA.lan}` : sideB.customAllowedIPs || sideA.lan;

        // --- Script for Side A (Hub) ---
        let scriptA = '';
        if (setupMode === 'new') {
            scriptA = `# --- Config for ${sideA.name || 'Server'} (New Interface) ---
/interface wireguard
add listen-port=${listenPort} name=wg-to-${sideB.name || 'branch'} private-key="${sideA.privateKey}"

/ip address
add address=${sideA.address || '10.0.10.1/30'} interface=wg-to-${sideB.name || 'branch'}`;
        } else {
            scriptA = `# --- Config for ${sideA.name || 'Server'} (Add Peer to Existing Interface) ---`;
        }

        scriptA += `
/interface wireguard peers
add allowed-address=${allowedIPsForA} ${sideB.endpoint ? `endpoint-address=${sideB.endpoint} endpoint-port=${listenPort}` : ''} interface=${setupMode === 'new' ? `wg-to-${sideB.name || 'branch'}` : (sideA.name || 'wg-server')} public-key="${sideB.publicKey}" persistent-keepalive=25s comment="Peer to ${sideB.name || 'branch'}"

/ip route
add dst-address=${sideB.lan || '192.168.2.0/24'} gateway=${(sideB.address || '10.0.10.2').split('/')[0]} comment="Route to ${sideB.name || 'branch'}"

# --- Firewall Rules ---
/ip firewall filter
add action=accept chain=input dst-port=${listenPort} protocol=udp comment="Allow WireGuard VPN Incoming"`;

        // --- Script for Side B (Branch) ---
        const scriptB = `# --- Config for ${sideB.name || 'Branch'} ---
/interface wireguard
add listen-port=${listenPort} name=wg-to-${sideA.name || 'server'} private-key="${sideB.privateKey}"

/ip address
add address=${sideB.address || '10.0.10.2/30'} interface=wg-to-${sideA.name || 'server'}

/interface wireguard peers
add allowed-address=${allowedIPsForB} ${sideA.endpoint ? `endpoint-address=${sideA.endpoint} endpoint-port=${listenPort}` : ''} interface=wg-to-${sideA.name || 'server'} public-key="${sideA.publicKey}" persistent-keepalive=25s comment="Peer to ${sideA.name || 'server'}"

/ip route
add dst-address=${sideA.lan || '192.168.1.0/24'} gateway=${(sideA.address || '10.0.10.1').split('/')[0]} comment="Route to ${sideA.name || 'server'}"

# --- Firewall Rules ---
/ip firewall filter
add action=accept chain=input dst-port=${listenPort} protocol=udp comment="Allow WireGuard VPN Incoming"`;

        setGeneratedResult({ scriptA, scriptB });

        // ✅ บันทึก Log การ Generate VPN Site-to-Site
        logService.createActivityLog(
            'GENERATE_VPN', 
            `Generate สคริปต์ WireGuard (Site-to-Site) ระหว่าง: ${formData.sideA.name || 'Side A'} และ ${formData.sideB.name || 'Side B'}`
        );

        toast.success('เจนสคริปต์ Site-to-Site สำเร็จ!');
    };

    const handleDownloadScript = (script, filename) => {
        const element = document.createElement("a");
        const file = new Blob([script], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `${filename}.rsc`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
      <div className="space-y-6">
        {/* Setup Options */}
        <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Setup Mode</label>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setSetupMode('new')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${setupMode === 'new' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Network size={14} /> New Connection</button>
                    <button onClick={() => setSetupMode('add-branch')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${setupMode === 'add-branch' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><PlusCircle size={14} /> Add Branch to Server</button>
                </div>
            </div>
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Routing Mode</label>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setRoutingMode('split')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${routingMode === 'split' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Split Tunnel</button>
                    <button onClick={() => setRoutingMode('custom')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${routingMode === 'custom' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Custom Tunnel</button>
                </div>
            </div>
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Listen Port (Server)</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={formData.listenPort} 
                        onChange={e => setFormData({...formData, listenPort: e.target.value.replace(/[^0-9]/g, '')})} 
                        className="bg-white border border-slate-200 rounded-xl px-4 py-1.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none w-24 shadow-sm"
                        placeholder="51820"
                    />
                    <button onClick={handleGeneratePort} className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold shadow-sm">Gen</button>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Side A / Server (HQ) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">SV</div> 
                    {setupMode === 'new' ? 'WireGuard Server Setup' : 'Existing Server Info (HQ)'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{setupMode === 'new' ? 'Server Name' : 'Server Interface Name'}</label>
                        <input type="text" value={formData.sideA.name} onChange={e => setFormData({...formData, sideA: {...formData.sideA, name: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder={setupMode === 'new' ? "เช่น SITE-HQ" : "เช่น wireguard-server"} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Server Tunnel IP</label>
                        <input type="text" value={formData.sideA.address} onChange={e => setFormData({...formData, sideA: {...formData.sideA, address: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น 10.0.10.1/30" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Server LAN Subnet(s)</label>
                        <input type="text" value={formData.sideA.lan} onChange={e => setFormData({...formData, sideA: {...formData.sideA, lan: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น 192.168.1.0/24, 192.168.10.0/24" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Server Public IP / Endpoint</label>
                        <input type="text" value={formData.sideA.endpoint} onChange={e => setFormData({...formData, sideA: {...formData.sideA, endpoint: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น server.ddns.com" />
                    </div>
                </div>

                {routingMode === 'custom' && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-[10px] font-black text-blue-600 uppercase mb-1">Allowed IPs on Server (Target to Branch LANs)</label>
                        <input type="text" value={formData.sideA.customAllowedIPs} onChange={e => setFormData({...formData, sideA: {...formData.sideA, customAllowedIPs: e.target.value}})} className="w-full border border-blue-100 rounded-xl p-2.5 text-xs bg-blue-50/30" placeholder="ใส่ได้หลายวง เช่น 192.168.2.0/24, 192.168.20.0/24" />
                    </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-600 uppercase">Server Security Keys</label>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Server Private Key {setupMode === 'add-branch' && '(Secret - สำหรับเจนสคริปต์)'}</label>
                            <div className="flex gap-2">
                                <input type="text" value={formData.sideA.privateKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, privateKey: e.target.value}})} className="flex-1 border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white" placeholder="Private Key ของ Server" />
                                <button onClick={() => handleGenerateKey('A')} className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold shadow-sm">Gen</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Server Public Key (Branch จะใช้ต่อมาที่นี่)</label>
                            <input type="text" value={formData.sideA.publicKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, publicKey: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white" placeholder="Public Key ของ Server" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Side B / Branch */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">BR</div> 
                    {setupMode === 'new' ? 'Branch (Side B) Setup' : 'New Branch Setup'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Branch Name</label>
                        <input type="text" value={formData.sideB.name} onChange={e => setFormData({...formData, sideB: {...formData.sideB, name: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น BRANCH-01" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Branch Tunnel IP</label>
                        <input type="text" value={formData.sideB.address} onChange={e => setFormData({...formData, sideB: {...formData.sideB, address: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น 10.0.10.2/30" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Branch LAN Subnet(s)</label>
                        <input type="text" value={formData.sideB.lan} onChange={e => setFormData({...formData, sideB: {...formData.sideB, lan: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น 192.168.2.0/24, 192.168.22.0/24" />
                    </div>
                    <div>
                        {/* Placeholder */}
                    </div>
                </div>

                {routingMode === 'custom' && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-[10px] font-black text-blue-600 uppercase mb-1">Allowed IPs on Branch (Target to Server LANs)</label>
                        <input type="text" value={formData.sideB.customAllowedIPs} onChange={e => setFormData({...formData, sideB: {...formData.sideB, customAllowedIPs: e.target.value}})} className="w-full border border-blue-100 rounded-xl p-2.5 text-xs bg-blue-50/30" placeholder="ใส่ได้หลายวง เช่น 192.168.1.0/24, 172.16.0.0/16" />
                    </div>
                )}

                <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-600 uppercase">Branch Security Keys</label>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Branch Private Key</label>
                            <div className="flex gap-2">
                                <input type="text" value={formData.sideB.privateKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, privateKey: e.target.value}})} className="flex-1 border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white" placeholder="Private Key ของ Branch" />
                                <button onClick={() => handleGenerateKey('B')} className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold shadow-sm">Gen</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Branch Public Key (Server จะใช้จำค่านี้)</label>
                            <input type="text" value={formData.sideB.publicKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, publicKey: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white" placeholder="Public Key ของ Branch" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-center">
            <button onClick={handleGenerate} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:-translate-y-1 transition-all">
                Generate Site-to-Site Scripts
            </button>
        </div>

        {generatedResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                <div className="bg-slate-900 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-white font-bold flex items-center gap-2"><Terminal size={18} className="text-blue-400" /> Script for {setupMode === 'new' ? (formData.sideA.name || 'Server') : 'Server (Add Peer)'}</h4>
                        <div className="flex gap-2">
                            <button onClick={() => handleDownloadScript(generatedResult.scriptA, `wg-${formData.sideA.name || 'server'}`)} className="text-slate-400 hover:text-blue-400 transition" title="Download .rsc"><Download size={18} /></button>
                            <button onClick={() => { navigator.clipboard.writeText(generatedResult.scriptA); toast.success('Copied!'); }} className="text-slate-400 hover:text-white"><Copy size={18} /></button>
                        </div>
                    </div>
                    <pre className="text-blue-400 text-[10px] font-mono bg-slate-800/50 p-4 rounded-xl overflow-x-auto max-h-[300px]">{generatedResult.scriptA}</pre>
                </div>
                <div className="bg-slate-900 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-white font-bold flex items-center gap-2"><Terminal size={18} className="text-emerald-400" /> Script for {formData.sideB.name || 'Branch'}</h4>
                        <div className="flex gap-2">
                            <button onClick={() => handleDownloadScript(generatedResult.scriptB, `wg-${formData.sideB.name || 'branch'}`)} className="text-slate-400 hover:text-emerald-400 transition" title="Download .rsc"><Download size={18} /></button>
                            <button onClick={() => { navigator.clipboard.writeText(generatedResult.scriptB); toast.success('Copied!'); }} className="text-slate-400 hover:text-white"><Copy size={18} /></button>
                        </div>
                    </div>
                    <pre className="text-emerald-400 text-[10px] font-mono bg-slate-800/50 p-4 rounded-xl overflow-x-auto max-h-[300px]">{generatedResult.scriptB}</pre>
                </div>
            </div>
        )}
      </div>
    );
};

export default SiteToSiteTab;
