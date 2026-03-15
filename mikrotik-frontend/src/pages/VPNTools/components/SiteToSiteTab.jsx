import React, { useState } from 'react';
import { Terminal, Copy, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateWireguardKeyPair } from '../../../utils/wireguardGenerator';

const SiteToSiteTab = () => {
    const [formData, setFormData] = useState({
      listenPort: '51820',
      sideA: { name: '', privateKey: '', publicKey: '', address: '', lan: '', endpoint: '' },
      sideB: { name: '', privateKey: '', publicKey: '', address: '', lan: '', endpoint: '' }
    });
  
    const [generatedResult, setGeneratedResult] = useState(null);
  
    const handleGenerateKey = (side) => {
        const { privateKey, publicKey } = generateWireguardKeyPair();
        if (side === 'A') {
            setFormData(prev => ({...prev, sideA: {...prev.sideA, privateKey: privateKey, publicKey: publicKey}}));
            toast.success('Generated keys for Side A');
        } else {
            setFormData(prev => ({...prev, sideB: {...prev.sideB, privateKey: privateKey, publicKey: publicKey}}));
            toast.success('Generated keys for Side B');
        }
    };
  
    const handleGenerate = () => {
        const { sideA, sideB, listenPort } = formData;
        if (!sideA.privateKey || !sideB.privateKey || !sideA.publicKey || !sideB.publicKey) {
            return toast.error('กรุณากรอก Private/Public Key ของทั้งสองฝั่ง');
        }

        const scriptA = `# --- Config for ${sideA.name || 'Site-A'} ---\n/interface wireguard\nadd listen-port=${listenPort} name=wg-to-${sideB.name || 'Side-B'} private-key="${sideA.privateKey}"\n\n/ip address\nadd address=${sideA.address || '10.0.10.1/30'} interface=wg-to-${sideB.name || 'Side-B'}\n\n/interface wireguard peers\nadd allowed-address=${sideB.address || '10.0.10.2/30'},${sideB.lan || '192.168.2.0/24'} ${sideB.endpoint ? `endpoint-address=${sideB.endpoint} endpoint-port=${listenPort}` : ''} interface=wg-to-${sideB.name || 'Side-B'} public-key="${sideB.publicKey}" persistent-keepalive=25s\n\n/ip route\nadd dst-address=${sideB.lan || '192.168.2.0/24'} gateway=${(sideB.address || '10.0.10.2').split('/')[0]} comment="Route to ${sideB.name || 'Side-B'}"`;

        const scriptB = `# --- Config for ${sideB.name || 'Site-B'} ---\n/interface wireguard\nadd listen-port=${listenPort} name=wg-to-${sideA.name || 'Side-A'} private-key="${sideB.privateKey}"\n\n/ip address\nadd address=${sideB.address || '10.0.10.2/30'} interface=wg-to-${sideA.name || 'Side-A'}\n\n/interface wireguard peers\nadd allowed-address=${sideA.address || '10.0.10.1/30'},${sideA.lan || '192.168.1.0/24'} ${sideA.endpoint ? `endpoint-address=${sideA.endpoint} endpoint-port=${listenPort}` : ''} interface=wg-to-${sideA.name || 'Side-A'} public-key="${sideA.publicKey}" persistent-keepalive=25s\n\n/ip route\nadd dst-address=${sideA.lan || '192.168.1.0/24'} gateway=${(sideA.address || '10.0.10.1').split('/')[0]} comment="Route to ${sideA.name || 'Side-A'}"`;

        setGeneratedResult({ scriptA, scriptB });
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">A</div> Side A Setup
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Name</label>
                        <input type="text" value={formData.sideA.name} onChange={e => setFormData({...formData, sideA: {...formData.sideA, name: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น SITE-MAIN" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tunnel IP</label>
                        <input type="text" value={formData.sideA.address} onChange={e => setFormData({...formData, sideA: {...formData.sideA, address: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น 10.0.10.1/30" />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Local LAN Subnet</label>
                    <input type="text" value={formData.sideA.lan} onChange={e => setFormData({...formData, sideA: {...formData.sideA, lan: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น 192.168.1.0/24" />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                    <div>
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Side A Private Key</label>
                        <div className="flex gap-2">
                            <input type="text" value={formData.sideA.privateKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, privateKey: e.target.value}})} className="flex-1 border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white" placeholder="Private Key" />
                            <button onClick={() => handleGenerateKey('A')} className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold">Generate</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Side A Public Key</label>
                        <input type="text" value={formData.sideA.publicKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, publicKey: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white" placeholder="Public Key จากฝั่ง Side A" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">B</div> Side B Setup
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Name</label>
                        <input type="text" value={formData.sideB.name} onChange={e => setFormData({...formData, sideB: {...formData.sideB, name: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น SITE-BRANCH" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tunnel IP</label>
                        <input type="text" value={formData.sideB.address} onChange={e => setFormData({...formData, sideB: {...formData.sideB, address: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น 10.0.10.2/30" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Local LAN Subnet</label>
                        <input type="text" value={formData.sideB.lan} onChange={e => setFormData({...formData, sideB: {...formData.sideB, lan: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น 192.168.2.0/24" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Public IP / Endpoint (Opt.)</label>
                        <input type="text" value={formData.sideB.endpoint} onChange={e => setFormData({...formData, sideB: {...formData.sideB, endpoint: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs" placeholder="เช่น 1.2.3.4" />
                    </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                    <div>
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Side B Private Key</label>
                        <div className="flex gap-2">
                            <input type="text" value={formData.sideB.privateKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, privateKey: e.target.value}})} className="flex-1 border border-slate-200 rounded-xl p-2 text-xs font-mono bg-white" placeholder="Private Key" />
                            <button onClick={() => handleGenerateKey('B')} className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold">Generate</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Side B Public Key</label>
                        <input type="text" value={formData.sideB.publicKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, publicKey: e.target.value}})} className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-mono bg-white" placeholder="Public Key จากฝั่ง Side B" />
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
                        <h4 className="text-white font-bold flex items-center gap-2"><Terminal size={18} className="text-blue-400" /> Script for {formData.sideA.name || 'Side A'}</h4>
                        <div className="flex gap-2">
                            <button onClick={() => handleDownloadScript(generatedResult.scriptA, `wg-${formData.sideA.name || 'side-a'}`)} className="text-slate-400 hover:text-blue-400 transition" title="Download .rsc"><Download size={18} /></button>
                            <button onClick={() => { navigator.clipboard.writeText(generatedResult.scriptA); toast.success('Copied!'); }} className="text-slate-400 hover:text-white"><Copy size={18} /></button>
                        </div>
                    </div>
                    <pre className="text-blue-400 text-xs font-mono bg-slate-800/50 p-4 rounded-xl overflow-x-auto max-h-[300px]">{generatedResult.scriptA}</pre>
                </div>
                <div className="bg-slate-900 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-white font-bold flex items-center gap-2"><Terminal size={18} className="text-emerald-400" /> Script for {formData.sideB.name || 'Side B'}</h4>
                        <div className="flex gap-2">
                            <button onClick={() => handleDownloadScript(generatedResult.scriptB, `wg-${formData.sideB.name || 'side-b'}`)} className="text-slate-400 hover:text-emerald-400 transition" title="Download .rsc"><Download size={18} /></button>
                            <button onClick={() => { navigator.clipboard.writeText(generatedResult.scriptB); toast.success('Copied!'); }} className="text-slate-400 hover:text-white"><Copy size={18} /></button>
                        </div>
                    </div>
                    <pre className="text-emerald-400 text-xs font-mono bg-slate-800/50 p-4 rounded-xl overflow-x-auto max-h-[300px]">{generatedResult.scriptB}</pre>
                </div>
            </div>
        )}
      </div>
    );
};

export default SiteToSiteTab;
