import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Download, Network, PlusCircle, Globe, Hash, ArrowRightLeft, Cpu, Zap, Activity, Settings2, RefreshCw, Info, ShieldCheck } from 'lucide-react';
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

    const StatusPill = ({ active, onClick, icon: Icon, label, activeClass, inactiveClass, description }) => (
        <div className="flex-1 min-w-[140px] group relative">
            <button 
                onClick={onClick}
                className={`w-full flex items-center justify-center h-11 px-4 rounded-xl border transition-all duration-300 font-bold text-[11px] hover:scale-[1.02] active:scale-95 shadow-sm uppercase tracking-wider ${
                    active ? activeClass : inactiveClass
                }`}
            >
                <Icon size={14} className={active ? "opacity-100" : "opacity-60"} />
                <span className="ml-2 whitespace-nowrap">{label}: {active ? 'ON' : 'OFF'}</span>
            </button>
            {description && (
                <div className="absolute top-full left-0 mt-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg font-medium leading-relaxed">
                    {description}
                </div>
            )}
        </div>
    );

    const isGenerateDisabled = !formData.listenPort || !formData.sideA.privateKey || !formData.sideB.privateKey;

    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4 sm:px-0">
        
        {/* --- 1. Header Section (Internal) --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sticky top-4 z-40">
            <div className="flex items-center gap-3 ml-2">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Network size={22} />
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-800 leading-none tracking-tight">Site-to-Site VPN Configuration</h2>
                    <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">Router-to-Router Connection</p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                {/* Port Input */}
                <div className={`flex items-center gap-2 bg-slate-50 pl-3 pr-1 py-1.5 rounded-xl border transition-all shadow-inner ${!formData.listenPort && setupMode === 'add-branch' ? 'bg-red-50 border-red-200 ring-4 ring-red-50' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${!formData.listenPort && setupMode === 'add-branch' ? 'text-red-400' : 'text-slate-400'}`}>Listen Port:</span>
                    <input 
                        type="text" 
                        value={formData.listenPort} 
                        onChange={e => setFormData({...formData, listenPort: e.target.value.replace(/[^0-9]/g, '')})} 
                        className={`bg-transparent text-sm font-bold w-16 outline-none h-5 placeholder:text-[9px] placeholder:font-bold text-center ${!formData.listenPort && setupMode === 'add-branch' ? 'text-red-600' : 'text-blue-600'}`}
                        placeholder="Req"
                    />
                    {setupMode === 'new' && (
                        <button onClick={handleGeneratePort} title="สุ่มพอร์ตใหม่" className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all"><Zap size={14} /></button>
                    )}
                </div>

                {/* Generate Action */}
                <button 
                    onClick={handleGenerate} 
                    disabled={isGenerateDisabled}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                        isGenerateDisabled 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                        : 'bg-slate-900 text-white shadow-lg hover:bg-black hover:-translate-y-0.5 active:translate-y-0'
                    }`}
                >
                    <Terminal size={14} />
                    Generate Scripts
                </button>
            </div>
        </div>

        {/* --- 2. Mode Selection --- */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button 
                onClick={() => setSetupMode('new')}
                className={`flex-1 flex items-start justify-center gap-4 py-4 px-6 rounded-xl transition-all duration-300 ${setupMode === 'new' ? 'bg-white text-blue-600 shadow-md scale-[1.01]' : 'text-slate-500 hover:bg-slate-200'}`}
            >
                <div className={`mt-1 p-2 rounded-xl ${setupMode === 'new' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><Network size={20} /></div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-wider leading-none">Full Connection Setup</p>
                    <p className={`text-xs font-medium mt-2 leading-relaxed ${setupMode === 'new' ? 'text-blue-500' : 'text-slate-400'}`}>
                        สร้างชุดคำสั่งใหม่สำหรับเราเตอร์ทั้ง 2 ฝั่ง <br/>(เหมาะสำหรับการเชื่อมต่อคู่ใหม่แกะกล่อง)
                    </p>
                </div>
            </button>
            <button 
                onClick={() => setSetupMode('add-branch')}
                className={`flex-1 flex items-start justify-center gap-4 py-4 px-6 rounded-xl transition-all duration-300 ${setupMode === 'add-branch' ? 'bg-white text-emerald-600 shadow-md scale-[1.01]' : 'text-slate-500 hover:bg-slate-200'}`}
            >
                <div className={`mt-1 p-2 rounded-xl ${setupMode === 'add-branch' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}><PlusCircle size={20} /></div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-wider leading-none">Expand Hub (Add Peer)</p>
                    <p className={`text-xs font-medium mt-2 leading-relaxed ${setupMode === 'add-branch' ? 'text-emerald-500' : 'text-slate-400'}`}>
                        สร้างเฉพาะชุดคำสั่งเพิ่มสาขาเข้ากับ Server เดิม <br/>(Side A จะได้เฉพาะคำสั่งเพิ่ม Peer ใหม่)
                    </p>
                </div>
            </button>
        </div>

        {/* --- 3. Configuration Cards --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Side A / Server */}
            <div className={`bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 transition-all duration-500 hover:border-blue-200 ${setupMode === 'add-branch' ? 'ring-2 ring-blue-500 ring-offset-4 ring-offset-slate-50' : ''}`}>
                <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner"><Globe size={20}/></div>
                        <div>
                            <span className="font-black text-slate-800 uppercase tracking-tight block leading-none text-base">Server Hub (Side A)</span>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Headquarters / Main Unit</p>
                        </div>
                    </div>
                    {setupMode === 'add-branch' && (
                        <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter animate-pulse">Existing Hub</span>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Router Name</label>
                        <input type="text" value={formData.sideA.name} onChange={e => setFormData({...formData, sideA: {...formData.sideA, name: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300" placeholder="HQ-Router" />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                            Tunnel IP 
                            <div className="group relative"><Info size={14} className="text-slate-300 cursor-help hover:text-blue-500 transition-colors"/><div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">IP สำหรับคุยกันภายในท่อ VPN (เช่น 10.0.10.1/30)</div></div>
                        </label>
                        <input type="text" value={formData.sideA.address} onChange={e => setFormData({...formData, sideA: {...formData.sideA, address: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300" placeholder="10.0.10.1/30" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Public IP / Endpoint Hostname</label>
                    <input type="text" value={formData.sideA.endpoint} onChange={e => setFormData({...formData, sideA: {...formData.sideA, endpoint: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300" placeholder="hq.yourdomain.com" />
                </div>

                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-5 shadow-inner">
                    <div className="flex flex-wrap gap-3">
                        <StatusPill 
                            active={formData.sideA.advertiseLan} 
                            onClick={() => setFormData({...formData, sideA: {...formData.sideA, advertiseLan: !formData.sideA.advertiseLan}})} 
                            icon={Network} 
                            label="Share LAN" 
                            activeClass="bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" 
                            inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-blue-300"
                            description="เปิดให้อีกฝั่ง (Side B) สามารถมองเห็นและเชื่อมต่อเข้าวงแลนของฝั่งนี้ได้"
                        />
                        {formData.sideA.advertiseLan && (
                            <StatusPill 
                                active={formData.sideA.autoRoute} 
                                onClick={() => setFormData({...formData, sideA: {...formData.sideA, autoRoute: !formData.sideA.autoRoute}})} 
                                icon={ArrowRightLeft} 
                                label="Auto-Route" 
                                activeClass="bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                                inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-blue-300"
                                description="เขียนเส้นทางรับ-ส่งข้อมูลบน MikroTik ให้อัตโนมัติ (ไม่ต้องตั้งค่า IP Route เอง)"
                            />
                        )}
                    </div>
                    {formData.sideA.advertiseLan && (
                        <div className="animate-in slide-in-from-top-2 duration-300 space-y-2">
                            <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">วงแลนที่ต้องการแชร์ (Local Subnets)</label>
                            <input type="text" value={formData.sideA.lan} onChange={e => setFormData({...formData, sideA: {...formData.sideA, lan: e.target.value}})} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-blue-700 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm" placeholder="เช่น 192.168.1.0/24, 10.0.0.0/16" />
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-2"><ShieldCheck size={14}/> Security Credentials</p>
                    <div className="space-y-4">
                        <div className="space-y-2"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Private Key</label><div className="flex gap-2"><input type="text" value={formData.sideA.privateKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, privateKey: e.target.value}})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono shadow-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none" /><button onClick={() => handleGenerateKey('A')} className="flex items-center gap-1.5 px-4 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-blue-600 transition-all shadow-md"><RefreshCw size={12} /> Keygen</button></div></div>
                        <div className="space-y-2"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Public Key</label><input type="text" value={formData.sideA.publicKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, publicKey: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono shadow-sm focus:bg-white transition-all outline-none" /></div>
                    </div>
                </div>
            </div>

            {/* Side B / Branch */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 hover:border-emerald-200 transition-colors duration-300">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-5">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner"><Activity size={20}/></div>
                    <div>
                        <span className="font-black text-slate-800 uppercase tracking-tight block leading-none text-base">Remote Site (Side B)</span>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Branch Office / Remote Node</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Router Name</label>
                        <input type="text" value={formData.sideB.name} onChange={e => setFormData({...formData, sideB: {...formData.sideB, name: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all placeholder:text-slate-300" placeholder="Branch-Router" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tunnel IP (Inside VPN)</label>
                        <input type="text" value={formData.sideB.address} onChange={e => setFormData({...formData, sideB: {...formData.sideB, address: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all placeholder:text-slate-300" placeholder="10.0.10.2/30" />
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Public Endpoint (Optional)</label>
                        <input 
                            type="text" 
                            value={formData.sideB.endpoint} 
                            onChange={e => setFormData({...formData, sideB: {...formData.sideB, endpoint: e.target.value}})} 
                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400" 
                            placeholder="e.g. branch.ddns.net" 
                        />
                    </div>
                    
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
                        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                            <span className="font-bold">TIP:</span> ไม่ต้องระบุหากฝั่งนี้ไม่มี Public IP <br/>
                            <span className="opacity-80">(ระบบจะเชื่อมต่อจากสาขาไปหาสำนักงานใหญ่แทน)</span>
                        </p>
                    </div>
                </div>
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-5 shadow-inner">
                    <div className="flex flex-wrap gap-3">
                        <StatusPill 
                            active={formData.sideB.advertiseLan} 
                            onClick={() => setFormData({...formData, sideB: {...formData.sideB, advertiseLan: !formData.sideB.advertiseLan}})} 
                            icon={Network} 
                            label="Share LAN" 
                            activeClass="bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                            inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-emerald-300"
                            description="เปิดให้ฝั่ง HQ (Side A) สามารถเชื่อมต่อเข้ามาที่วงแลนของสาขานี้ได้"
                        />
                        {formData.sideB.advertiseLan && (
                            <StatusPill 
                                active={formData.sideB.autoRoute} 
                                onClick={() => setFormData({...formData, sideB: {...formData.sideB, autoRoute: !formData.sideB.autoRoute}})} 
                                icon={ArrowRightLeft} 
                                label="Auto-Route" 
                                activeClass="bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                                inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-emerald-300"
                                description="เขียนเส้นทางรับ-ส่งข้อมูลบน MikroTik ให้อัตโนมัติ"
                            />
                        )}
                    </div>
                    {formData.sideB.advertiseLan && (
                        <div className="animate-in slide-in-from-top-2 duration-300 space-y-2">
                            <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider ml-1">วงแลนที่ต้องการแชร์ (Local Subnets)</label>
                            <input type="text" value={formData.sideB.lan} onChange={e => setFormData({...formData, sideB: {...formData.sideB, lan: e.target.value}})} className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none shadow-sm transition-all placeholder:text-slate-300" placeholder="เช่น 192.168.2.0/24" />
                        </div>
                    )}
                </div>
                <div className="space-y-4 pt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-2"><ShieldCheck size={14}/> Security Credentials</p>
                    <div className="space-y-4">
                        <div className="space-y-2"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Private Key</label><div className="flex gap-2"><input type="text" value={formData.sideB.privateKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, privateKey: e.target.value}})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono shadow-sm focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all outline-none" /><button onClick={() => handleGenerateKey('B')} className="flex items-center gap-1.5 px-4 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-600 transition-all shadow-md"><RefreshCw size={12} /> Keygen</button></div></div>
                        <div className="space-y-2"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Public Key</label><input type="text" value={formData.sideB.publicKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, publicKey: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono shadow-sm focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all outline-none" /></div>
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
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5 shadow-inner">
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
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5 shadow-inner">
                        <pre className="text-emerald-300 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px] scrollbar-hide">{generatedResult.scriptB}</pre>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
};

export default SiteToSiteTab;