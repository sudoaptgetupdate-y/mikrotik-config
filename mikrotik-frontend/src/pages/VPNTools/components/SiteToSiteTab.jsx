import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Download, Network, PlusCircle, Globe, Hash, ArrowRightLeft, Cpu, Zap, Activity, Settings2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateWireguardKeyPair, generateS2SConfig } from '../../../utils/wireguardGenerator';
import { logService } from '../../../services/logService';

const SiteToSiteTab = () => {
    const [setupMode, setSetupMode] = useState('new'); // 'new' or 'add-branch'
    const resultsRef = useRef(null); // 🟢 Ref for auto-scroll
    
    const [formData, setFormData] = useState({
      listenPort: '',
      sideA: { name: '', privateKey: '', publicKey: '', address: '', lan: '', endpoint: '', advertiseLan: false, autoRoute: true },
      sideB: { name: '', privateKey: '', publicKey: '', address: '', lan: '', endpoint: '', advertiseLan: false, autoRoute: true }
    });
  
    const [generatedResult, setGeneratedResult] = useState(null);

    // 🟢 Port Management: Sync with setup mode
    useEffect(() => {
        if (setupMode === 'new') {
            const randomPort = Math.floor(Math.random() * (65000 - 10000 + 1)) + 10000;
            setFormData(prev => ({...prev, listenPort: randomPort.toString()}));
        } else {
            setFormData(prev => ({...prev, listenPort: ''})); // Force manual for Expand
        }
    }, [setupMode]);

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
        const randomPort = Math.floor(Math.random() * (65000 - 10000 + 1)) + 10000;
        setFormData(prev => ({...prev, listenPort: randomPort.toString()}));
        toast.success(`Generated Port: ${randomPort}`);
    };
  
    const handleGenerate = () => {
        const { sideA, sideB, listenPort } = formData;
        if (!listenPort) return toast.error('กรุณาระบุ Listen Port');
        if (!sideA.privateKey || !sideB.privateKey) return toast.error('กรุณากรอก Private Key ของทั้งสองฝั่ง');

        const params = {
            listenPort,
            sideA: { ...sideA, lan: sideA.advertiseLan ? sideA.lan : '', autoRoute: sideA.advertiseLan ? sideA.autoRoute : false },
            sideB: { ...sideB, lan: sideB.advertiseLan ? sideB.lan : '', autoRoute: sideB.advertiseLan ? sideB.autoRoute : false }
        };

        const { scriptA, scriptB } = generateS2SConfig(params);

        const finalScriptA = setupMode === 'new' 
            ? `# --- Config for ${sideA.name || 'Server'} (New Interface) ---\n${scriptA}`
            : `# --- Config for ${sideA.name || 'Server'} (Add Peer) ---\n/interface wireguard peers${scriptA.split('/interface wireguard peers')[1] || scriptA}`;

        const finalScriptB = `# --- Config for ${sideB.name || 'Branch'} ---\n${scriptB}`;

        setGeneratedResult({ scriptA: finalScriptA, scriptB: finalScriptB });
        logService.createActivityLog('GENERATE_VPN', `WireGuard S2S: ${sideA.name || 'A'} <-> ${sideB.name || 'B'}`);
        toast.success('Generated Successfully!');

        // 🟢 Auto-scroll to results
        setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
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

    const StatusPill = ({ active, onClick, icon: Icon, label, activeClass, inactiveClass }) => (
        <button 
            onClick={onClick}
            className={`flex items-center justify-center h-10 px-4 rounded-xl border transition-all duration-300 font-bold text-[11px] hover:scale-[1.02] active:scale-95 shadow-sm ${
                active ? activeClass : inactiveClass
            }`}
        >
            <Icon size={14} className={active ? "opacity-100" : "opacity-60"} />
            <span className="ml-2 whitespace-nowrap uppercase tracking-wider">{label}: {active ? 'ON' : 'OFF'}</span>
        </button>
    );

    const isGenerateDisabled = !formData.listenPort || !formData.sideA.privateKey || !formData.sideB.privateKey;

    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4 sm:px-0">
        
        {/* --- 1. Header Section (Synced with C2S) --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200 shadow-sm sticky top-4 z-40">
            <div className="flex items-center gap-3 ml-2">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md">
                    <Network size={22} />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-800 leading-none tracking-tight">Site-to-Site VPN Configuration</h2>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold uppercase tracking-wider">WireGuard Protocol</p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                {/* Port Input */}
                <div className={`flex items-center gap-2 bg-slate-50 pl-3 pr-1 py-1 rounded-xl border transition-all ${!formData.listenPort && setupMode === 'add-branch' ? 'bg-red-50 border-red-200 ring-4 ring-red-50' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
                    <span className={`text-[9px] font-bold uppercase tracking-tight ${!formData.listenPort && setupMode === 'add-branch' ? 'text-red-400' : 'text-slate-400'}`}>Port:</span>
                    <input 
                        type="text" 
                        value={formData.listenPort} 
                        onChange={e => setFormData({...formData, listenPort: e.target.value.replace(/[^0-9]/g, '')})} 
                        className={`bg-transparent text-sm font-bold w-14 outline-none h-5 placeholder:text-[9px] placeholder:font-bold ${!formData.listenPort && setupMode === 'add-branch' ? 'text-red-600' : 'text-blue-600'}`}
                        placeholder="Request"
                    />
                    {setupMode === 'new' && (
                        <button onClick={handleGeneratePort} className="p-1 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all"><Zap size={14} /></button>
                    )}
                </div>

                {/* Generate Action */}
                <button 
                    onClick={handleGenerate} 
                    disabled={isGenerateDisabled}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                        isGenerateDisabled 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                        : 'bg-slate-900 text-white shadow-lg hover:bg-black hover:-translate-y-0.5 active:translate-y-0'
                    }`}
                >
                    <Terminal size={14} />
                    Generate
                </button>
            </div>
        </div>

        {/* --- 2. Mode Selection --- */}
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200/50 shadow-inner">
            <button 
                onClick={() => setSetupMode('new')}
                className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-2xl transition-all duration-300 ${setupMode === 'new' ? 'bg-white text-blue-600 shadow-lg scale-[1.01]' : 'text-slate-500 hover:bg-slate-200'}`}
            >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${setupMode === 'new' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><Network size={18} /></div>
                <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wider leading-none">Full Connection</p>
                    <p className={`text-xs font-normal mt-1 ${setupMode === 'new' ? 'text-blue-500' : 'text-slate-400'}`}>สร้างใหม่ทั้ง 2 ฝั่ง</p>
                </div>
            </button>
            <button 
                onClick={() => setSetupMode('add-branch')}
                className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-2xl transition-all duration-300 ${setupMode === 'add-branch' ? 'bg-white text-emerald-600 shadow-lg scale-[1.01]' : 'text-slate-500 hover:bg-slate-200'}`}
            >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${setupMode === 'add-branch' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}><PlusCircle size={18} /></div>
                <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wider leading-none">Expand Server</p>
                    <p className={`text-xs font-normal mt-1 ${setupMode === 'add-branch' ? 'text-emerald-500' : 'text-slate-400'}`}>เพิ่มสาขาเข้า Server เดิม</p>
                </div>
            </button>
        </div>

        {/* --- 3. Configuration Cards --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Side A / Server */}
            <div className={`bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 transition-all duration-500 ${setupMode === 'add-branch' ? 'opacity-70 grayscale-[0.3]' : ''}`}>
                <div className="flex items-center gap-3 border-b border-slate-50 pb-5">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner"><Globe size={20}/></div>
                    <div>
                        <span className="font-bold text-slate-800 uppercase tracking-tight block leading-none">Server Hub (Side A)</span>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">HQ / Main Office</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Server Name</label>
                        <input type="text" value={formData.sideA.name} onChange={e => setFormData({...formData, sideA: {...formData.sideA, name: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all" placeholder="HQ-GW" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Tunnel IP</label>
                        <input type="text" value={formData.sideA.address} onChange={e => setFormData({...formData, sideA: {...formData.sideA, address: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all" placeholder="10.0.10.1/30" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Public IP / Endpoint</label>
                    <input type="text" value={formData.sideA.endpoint} onChange={e => setFormData({...formData, sideA: {...formData.sideA, endpoint: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all" placeholder="hq.yourdomain.com" />
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-5 shadow-inner">
                    <div className="flex flex-wrap gap-2">
                        <StatusPill active={formData.sideA.advertiseLan} onClick={() => setFormData({...formData, sideA: {...formData.sideA, advertiseLan: !formData.sideA.advertiseLan}})} icon={Network} label="Share Networks" activeClass="bg-blue-600 border-blue-600 text-white shadow-lg" inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-blue-300" />
                        {formData.sideA.advertiseLan && <StatusPill active={formData.sideA.autoRoute} onClick={() => setFormData({...formData, sideA: {...formData.sideA, autoRoute: !formData.sideA.autoRoute}})} icon={ArrowRightLeft} label="Auto-Route" activeClass="bg-emerald-600 border-emerald-600 text-white shadow-lg" inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-emerald-300" />}
                    </div>
                    {formData.sideA.advertiseLan && <div className="animate-in slide-in-from-top-2 duration-300 space-y-2"><label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">Accessible Local Networks</label><input type="text" value={formData.sideA.lan} onChange={e => setFormData({...formData, sideA: {...formData.sideA, lan: e.target.value}})} className="w-full px-4 py-3 bg-white border border-blue-100 rounded-2xl text-xs font-semibold text-blue-700 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm" placeholder="192.168.1.0/24, 10.0.0.0/16" /></div>}
                </div>

                <div className="space-y-4 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Security Credentials</p>
                    <div className="space-y-4">
                        <div className="space-y-2"><label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Private Key</label><div className="flex gap-2"><input type="text" value={formData.sideA.privateKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, privateKey: e.target.value}})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono shadow-sm focus:bg-white transition-all outline-none" /><button onClick={() => handleGenerateKey('A')} className="flex items-center gap-1.5 px-4 bg-slate-800 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 transition-all shadow-md"><RefreshCw size={12} /> Keygen</button></div></div>
                        <div className="space-y-2"><label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Public Key</label><input type="text" value={formData.sideA.publicKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, publicKey: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono shadow-sm focus:bg-white transition-all outline-none" /></div>
                    </div>
                </div>
            </div>

            {/* Side B / Branch */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-5">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner"><Activity size={20}/></div>
                    <div>
                        <span className="font-bold text-slate-800 uppercase tracking-tight block leading-none">Remote Site (Side B)</span>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Branch / Client Node</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Branch Name</label>
                        <input type="text" value={formData.sideB.name} onChange={e => setFormData({...formData, sideB: {...formData.sideB, name: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:bg-white outline-none transition-all" placeholder="BRANCH-01" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Tunnel IP</label>
                        <input type="text" value={formData.sideB.address} onChange={e => setFormData({...formData, sideB: {...formData.sideB, address: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-sm font-semibold text-slate-700 focus:bg-white outline-none transition-all" placeholder="10.0.10.2/30" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Public Endpoint (Optional)</label>
                    <input type="text" value={formData.sideB.endpoint} onChange={e => setFormData({...formData, sideB: {...formData.sideB, endpoint: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:bg-white outline-none transition-all" placeholder="remote.endpoint.com" />
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-5 shadow-inner">
                    <div className="flex flex-wrap gap-2">
                        <StatusPill active={formData.sideB.advertiseLan} onClick={() => setFormData({...formData, sideB: {...formData.sideB, advertiseLan: !formData.sideB.advertiseLan}})} icon={Network} label="Share Networks" activeClass="bg-emerald-600 border-emerald-600 text-white shadow-lg" inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-emerald-300" />
                        {formData.sideB.advertiseLan && <StatusPill active={formData.sideB.autoRoute} onClick={() => setFormData({...formData, sideB: {...formData.sideB, autoRoute: !formData.sideB.autoRoute}})} icon={ArrowRightLeft} label="Auto-Route" activeClass="bg-emerald-600 border-emerald-600 text-white shadow-lg" inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-emerald-300" />}
                    </div>
                    {formData.sideB.advertiseLan && <div className="animate-in slide-in-from-top-2 duration-300 space-y-2"><label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider ml-1">Accessible Local Networks</label><input type="text" value={formData.sideB.lan} onChange={e => setFormData({...formData, sideB: {...formData.sideB, lan: e.target.value}})} className="w-full px-4 py-3 bg-white border border-emerald-100 rounded-2xl text-xs font-semibold text-emerald-700 focus:ring-4 focus:ring-emerald-50 outline-none shadow-sm transition-all" placeholder="192.168.2.0/24" /></div>}
                </div>
                <div className="space-y-4 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Security Credentials</p>
                    <div className="space-y-4">
                        <div className="space-y-2"><label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Private Key</label><div className="flex gap-2"><input type="text" value={formData.sideB.privateKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, privateKey: e.target.value}})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono shadow-sm focus:bg-white transition-all outline-none" /><button onClick={() => handleGenerateKey('B')} className="flex items-center gap-1.5 px-4 bg-slate-800 text-white rounded-2xl text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-md"><RefreshCw size={12} /> Keygen</button></div></div>
                        <div className="space-y-2"><label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider ml-1">Public Key</label><input type="text" value={formData.sideB.publicKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, publicKey: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono shadow-sm focus:bg-white transition-all outline-none" /></div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- 4. Results Section --- */}
        <div ref={resultsRef} className="h-4" />
        {generatedResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl space-y-4 border border-slate-800 relative group">
                    <div className="absolute top-6 right-6 flex gap-2">
                        <button onClick={() => handleDownloadScript(generatedResult.scriptA, `wg-${formData.sideA.name || 'server'}`)} className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-blue-600 transition-all flex items-center justify-center border border-white/5" title="Download .rsc"><Download size={18} /></button>
                        <button onClick={() => { navigator.clipboard.writeText(generatedResult.scriptA); toast.success('Copied!'); }} className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/5"><Copy size={18} /></button>
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center"><Terminal size={16} /></div>
                        <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Server Script (Paste to MikroTik)</h4>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                        <pre className="text-blue-300 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px] scrollbar-hide">{generatedResult.scriptA}</pre>
                    </div>
                </div>
                
                <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl space-y-4 border border-slate-800 relative group">
                    <div className="absolute top-6 right-6 flex gap-2">
                        <button onClick={() => handleDownloadScript(generatedResult.scriptB, `wg-${formData.sideB.name || 'branch'}`)} className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-emerald-600 transition-all flex items-center justify-center border border-white/5" title="Download .rsc"><Download size={18} /></button>
                        <button onClick={() => { navigator.clipboard.writeText(generatedResult.scriptB); toast.success('Copied!'); }} className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/5"><Copy size={18} /></button>
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center"><Terminal size={16} /></div>
                        <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">Branch Script</h4>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                        <pre className="text-emerald-300 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px] scrollbar-hide">{generatedResult.scriptB}</pre>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
};

export default SiteToSiteTab;