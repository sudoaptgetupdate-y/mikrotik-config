import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Download, Network, PlusCircle, Globe, Hash, ArrowRightLeft, Cpu, Zap, Activity, Settings2, RefreshCw, Info, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { generateWireguardKeyPair, generateS2SConfig } from '../../../utils/wireguardGenerator';
import { logService } from '../../../services/logService';

const SiteToSiteTab = () => {
    const { t } = useTranslation();
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
        toast.success(t('vpn.s2s.toast_keys_success', { side }));
    };

    const handleGeneratePort = () => {
        const randomPort = Math.floor(Math.random() * (65000 - 10000 + 1)) + 10000;
        setFormData(prev => ({...prev, listenPort: randomPort.toString()}));
        toast.success(t('vpn.s2s.toast_port_success', { port: randomPort }));
    };
  
    const handleGenerate = () => {
        const { sideA, sideB, listenPort } = formData;
        if (!listenPort) return toast.error(t('vpn.s2s.error_port'));
        if (!sideA.privateKey || !sideB.privateKey) return toast.error(t('vpn.s2s.error_keys'));

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
        toast.success(t('vpn.s2s.toast_generate_success'));

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
        <div className="flex-auto min-w-[120px] group relative">
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
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        
        {/* --- 1. Header Section (Internal) --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm sticky top-4 z-40">
            <div className="flex items-center gap-3 sm:ml-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                    <Network size={20} className="sm:hidden" />
                    <Network size={22} className="hidden sm:block" />
                </div>
                <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-800 leading-none tracking-tight">{t('vpn.s2s.title')}</h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 sm:mt-1.5 font-bold uppercase tracking-widest">{t('vpn.s2s.subtitle')}</p>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Port Input */}
                <div className={`flex items-center gap-2 bg-slate-50 pl-3 pr-1 py-1.5 rounded-xl border transition-all shadow-inner ${!formData.listenPort && setupMode === 'add-branch' ? 'bg-red-50 border-red-200 ring-4 ring-red-50' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${!formData.listenPort && setupMode === 'add-branch' ? 'text-red-400' : 'text-slate-400'}`}>{t('vpn.s2s.port_label')}</span>
                    <input 
                        type="text" 
                        value={formData.listenPort} 
                        onChange={e => setFormData({...formData, listenPort: e.target.value.replace(/[^0-9]/g, '')})} 
                        className={`bg-transparent text-sm font-bold w-12 sm:w-16 outline-none h-5 placeholder:text-[9px] placeholder:font-bold text-center ${!formData.listenPort && setupMode === 'add-branch' ? 'text-red-600' : 'text-blue-600'}`}
                        placeholder="Req"
                    />
                    {setupMode === 'new' && (
                        <button onClick={handleGeneratePort} title={t('vpn.s2s.btn_keygen')} className="p-1 sm:p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all"><Zap size={14} /></button>
                    )}
                </div>

                {/* Generate Action */}
                <button 
                    onClick={handleGenerate} 
                    disabled={isGenerateDisabled}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                        isGenerateDisabled 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                        : 'bg-slate-900 text-white shadow-lg hover:bg-black hover:-translate-y-0.5 active:translate-y-0'
                    }`}
                >
                    <Terminal size={14} />
                    {t('vpn.s2s.btn_generate')}
                </button>
            </div>
        </div>

        {/* --- 2. Mode Selection --- */}
        <div className="flex flex-col sm:flex-row bg-slate-100 p-1 sm:p-1.5 rounded-2xl border border-slate-200 shadow-inner gap-1 sm:gap-0">
            <button 
                onClick={() => setSetupMode('new')}
                className={`flex-1 flex items-start justify-center gap-3 sm:gap-4 py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-300 ${setupMode === 'new' ? 'bg-white text-blue-600 shadow-md scale-[1.01]' : 'text-slate-500 hover:bg-slate-200'}`}
            >
                <div className={`mt-1 p-2 rounded-xl ${setupMode === 'new' ? 'bg-blue-50 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><Network size={20} /></div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-wider leading-none">{t('vpn.s2s.modes.new_title')}</p>
                    <p className={`text-[11px] sm:text-xs font-medium mt-1.5 sm:mt-2 leading-relaxed ${setupMode === 'new' ? 'text-blue-500' : 'text-slate-400'}`}>
                        {t('vpn.s2s.modes.new_desc')}
                    </p>
                </div>
            </button>
            <button 
                onClick={() => setSetupMode('add-branch')}
                className={`flex-1 flex items-start justify-center gap-3 sm:gap-4 py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-300 ${setupMode === 'add-branch' ? 'bg-white text-emerald-600 shadow-md scale-[1.01]' : 'text-slate-500 hover:bg-slate-200'}`}
            >
                <div className={`mt-1 p-2 rounded-xl ${setupMode === 'add-branch' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}><PlusCircle size={20} /></div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-wider leading-none">{t('vpn.s2s.modes.expand_title')}</p>
                    <p className={`text-[11px] sm:text-xs font-medium mt-1.5 sm:mt-2 leading-relaxed ${setupMode === 'add-branch' ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {t('vpn.s2s.modes.expand_desc')}
                    </p>
                </div>
            </button>
        </div>

        {/* --- 3. Configuration Cards --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Side A / Server */}
            <div className={`bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-6 transition-all duration-500 hover:border-blue-200 ${setupMode === 'add-branch' ? 'ring-2 ring-blue-500 ring-offset-4 ring-offset-slate-50' : ''}`}>
                <div className="flex items-center justify-between border-b border-slate-50 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner"><Globe size={20}/></div>
                        <div>
                            <span className="font-black text-slate-800 uppercase tracking-tight block leading-none text-base">{t('vpn.s2s.side_a.title')}</span>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">{t('vpn.s2s.side_a.subtitle')}</p>
                        </div>
                    </div>
                    {setupMode === 'add-branch' && (
                        <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-tighter animate-pulse">{t('vpn.s2s.side_a.existing_badge')}</span>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('vpn.s2s.side_a.label_name')}</label>
                        <input type="text" value={formData.sideA.name} onChange={e => setFormData({...formData, sideA: {...formData.sideA, name: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300" placeholder={t('vpn.s2s.placeholders.router_name')} />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                            {t('vpn.s2s.side_a.label_tunnel_ip')}
                            <div className="group relative"><Info size={14} className="text-slate-300 cursor-help hover:text-blue-500 transition-colors"/><div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">{t('vpn.s2s.side_a.tunnel_help')}</div></div>
                        </label>
                        <input type="text" value={formData.sideA.address} onChange={e => setFormData({...formData, sideA: {...formData.sideA, address: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300" placeholder={t('vpn.s2s.placeholders.tunnel_ip')} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('vpn.s2s.side_a.label_endpoint')}</label>
                    <input type="text" value={formData.sideA.endpoint} onChange={e => setFormData({...formData, sideA: {...formData.sideA, endpoint: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all placeholder:text-slate-300" placeholder={t('vpn.s2s.placeholders.endpoint')} />
                </div>

                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-5 shadow-inner">
                    <div className="flex flex-wrap gap-3">
                        <StatusPill 
                            active={formData.sideA.advertiseLan} 
                            onClick={() => setFormData({...formData, sideA: {...formData.sideA, advertiseLan: !formData.sideA.advertiseLan}})} 
                            icon={Network} 
                            label={t('vpn.s2s.side_a.share_lan')} 
                            activeClass="bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" 
                            inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-blue-300"
                            description={t('vpn.s2s.side_a.share_lan_help')}
                        />
                        {formData.sideA.advertiseLan && (
                            <StatusPill 
                                active={formData.sideA.autoRoute} 
                                onClick={() => setFormData({...formData, sideA: {...formData.sideA, autoRoute: !formData.sideA.autoRoute}})} 
                                icon={ArrowRightLeft} 
                                label={t('vpn.s2s.side_a.auto_route')} 
                                activeClass="bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                                inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-blue-300"
                                description={t('vpn.s2s.side_a.auto_route_help')}
                            />
                        )}
                    </div>
                    {formData.sideA.advertiseLan && (
                        <div className="animate-in slide-in-from-top-2 duration-300 space-y-2">
                            <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1">{t('vpn.s2s.side_a.label_local_subnets')}</label>
                            <input type="text" value={formData.sideA.lan} onChange={e => setFormData({...formData, sideA: {...formData.sideA, lan: e.target.value}})} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-blue-700 focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all shadow-sm" placeholder={t('vpn.s2s.placeholders.local_subnets')} />
                        </div>
                    )}
                </div>

                <div className="space-y-4 pt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-2"><ShieldCheck size={14}/> {t('vpn.s2s.section_security')}</p>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('vpn.s2s.label_private_key')}</label>
                            <div className="flex gap-2">
                                <input type="text" value={formData.sideA.privateKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, privateKey: e.target.value}})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono shadow-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all outline-none min-w-0" />
                                <button onClick={() => handleGenerateKey('A')} className="flex items-center gap-1.5 px-3 sm:px-4 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-blue-600 transition-all shadow-md shrink-0">
                                    <RefreshCw size={12} /> <span className="hidden sm:inline">{t('vpn.s2s.btn_keygen')}</span>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('vpn.s2s.label_public_key')}</label><input type="text" value={formData.sideA.publicKey} onChange={e => setFormData({...formData, sideA: {...formData.sideA, publicKey: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono shadow-sm focus:bg-white transition-all outline-none" /></div>
                    </div>
                </div>
            </div>

            {/* Side B / Branch */}
            <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-6 hover:border-emerald-200 transition-colors duration-300">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-5">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner"><Activity size={20}/></div>
                    <div>
                        <span className="font-black text-slate-800 uppercase tracking-tight block leading-none text-base">{t('vpn.s2s.side_b.title')}</span>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">{t('vpn.s2s.side_b.subtitle')}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('vpn.s2s.side_b.label_name')}</label>
                        <input type="text" value={formData.sideB.name} onChange={e => setFormData({...formData, sideB: {...formData.sideB, name: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all placeholder:text-slate-300" placeholder={t('vpn.s2s.placeholders.router_name')} />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('vpn.s2s.side_b.label_tunnel_ip')}</label>
                        <input type="text" value={formData.sideB.address} onChange={e => setFormData({...formData, sideB: {...formData.sideB, address: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-semibold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none transition-all placeholder:text-slate-300" placeholder={t('vpn.s2s.placeholders.tunnel_ip')} />
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('vpn.s2s.side_b.label_endpoint')}</label>
                        <input 
                            type="text" 
                            value={formData.sideB.endpoint} 
                            onChange={e => setFormData({...formData, sideB: {...formData.sideB, endpoint: e.target.value}})} 
                            className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none transition-all placeholder:text-slate-400" 
                            placeholder={t('vpn.s2s.placeholders.endpoint_optional')} 
                        />
                    </div>
                    
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-1">
                        <div className="shrink-0"><Info size={16} className="text-amber-600 mt-0.5" /></div>
                        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                            {t('vpn.s2s.side_b.endpoint_tip')}
                        </p>
                    </div>
                </div>
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-5 shadow-inner">
                    <div className="flex flex-wrap gap-3">
                        <StatusPill 
                            active={formData.sideB.advertiseLan} 
                            onClick={() => setFormData({...formData, sideB: {...formData.sideB, advertiseLan: !formData.sideB.advertiseLan}})} 
                            icon={Network} 
                            label={t('vpn.s2s.side_b.share_lan')} 
                            activeClass="bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                            inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-emerald-300"
                            description={t('vpn.s2s.side_b.share_lan_help')}
                        />
                        {formData.sideB.advertiseLan && (
                            <StatusPill 
                                active={formData.sideB.autoRoute} 
                                onClick={() => setFormData({...formData, sideB: {...formData.sideB, autoRoute: !formData.sideB.autoRoute}})} 
                                icon={ArrowRightLeft} 
                                label={t('vpn.s2s.side_b.auto_route')} 
                                activeClass="bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                                inactiveClass="bg-white border-slate-200 text-slate-400 hover:border-emerald-300"
                                description={t('vpn.s2s.side_b.auto_route_help')}
                            />
                        )}
                    </div>
                    {formData.sideB.advertiseLan && (
                        <div className="animate-in slide-in-from-top-2 duration-300 space-y-2">
                            <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider ml-1">{t('vpn.s2s.side_b.label_local_subnets')}</label>
                            <input type="text" value={formData.sideB.lan} onChange={e => setFormData({...formData, sideB: {...formData.sideB, lan: e.target.value}})} className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 outline-none shadow-sm transition-all placeholder:text-slate-300" placeholder={t('vpn.s2s.placeholders.local_subnets')} />
                        </div>
                    )}
                </div>
                <div className="space-y-4 pt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center gap-2"><ShieldCheck size={14}/> {t('vpn.s2s.section_security')}</p>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('vpn.s2s.label_private_key')}</label>
                            <div className="flex gap-2">
                                <input type="text" value={formData.sideB.privateKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, privateKey: e.target.value}})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono shadow-sm focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all outline-none min-w-0" />
                                <button onClick={() => handleGenerateKey('B')} className="flex items-center gap-1.5 px-3 sm:px-4 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase hover:bg-emerald-600 transition-all shadow-md shrink-0">
                                    <RefreshCw size={12} /> <span className="hidden sm:inline">{t('vpn.s2s.btn_keygen')}</span>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2"><label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{t('vpn.s2s.label_public_key')}</label><input type="text" value={formData.sideB.publicKey} onChange={e => setFormData({...formData, sideB: {...formData.sideB, publicKey: e.target.value}})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono shadow-sm focus:bg-white focus:ring-4 focus:ring-emerald-50 focus:border-emerald-400 transition-all outline-none" /></div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- 4. Results Section --- */}
        <div ref={resultsRef} className="h-4" />
        {generatedResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
                <div className="bg-slate-900 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl space-y-4 border border-slate-800 relative group">
                    <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex gap-2">
                        <button onClick={() => handleDownloadScript(generatedResult.scriptA, `wg-${formData.sideA.name || 'server'}`)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 text-white hover:bg-blue-600 transition-all flex items-center justify-center border border-white/5" title="Download .rsc"><Download size={16} /></button>
                        <button onClick={() => { navigator.clipboard.writeText(generatedResult.scriptA); toast.success(t('common.copied')); }} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/5"><Copy size={16} /></button>
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center"><Terminal size={16} /></div>
                        <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">{t('vpn.s2s.results.server_title')}</h4>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-4 sm:p-6 border border-white/5 shadow-inner">
                        <pre className="text-blue-300 text-[10px] sm:text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px] scrollbar-hide">{generatedResult.scriptA}</pre>
                    </div>
                </div>
                
                <div className="bg-slate-900 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl space-y-4 border border-slate-800 relative group">
                    <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex gap-2">
                        <button onClick={() => handleDownloadScript(generatedResult.scriptB, `wg-${formData.sideB.name || 'branch'}`)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 text-white hover:bg-emerald-600 transition-all flex items-center justify-center border border-white/5" title="Download .rsc"><Download size={16} /></button>
                        <button onClick={() => { navigator.clipboard.writeText(generatedResult.scriptB); toast.success(t('common.copied')); }} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center border border-white/5"><Copy size={16} /></button>
                    </div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center"><Terminal size={16} /></div>
                        <h4 className="text-white font-bold uppercase tracking-wider text-[11px]">{t('vpn.s2s.results.branch_title')}</h4>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-4 sm:p-6 border border-white/5 shadow-inner">
                        <pre className="text-emerald-300 text-[10px] sm:text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[400px] scrollbar-hide">{generatedResult.scriptB}</pre>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
};

export default SiteToSiteTab;