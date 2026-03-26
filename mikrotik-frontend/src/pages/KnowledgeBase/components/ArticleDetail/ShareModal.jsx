import React from 'react';
import { X as XIcon, Share2, Facebook, Twitter, Link as LinkIcon, MessageCircle } from 'lucide-react';

const ShareModal = ({ isShareModalOpen, setIsShareModalOpen, handleShare, t }) => {
  if (!isShareModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsShareModalOpen(false)} />
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-900 uppercase tracking-[0.2em] text-sm flex items-center gap-3">
            <div className="size-8 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Share2 size={16} /></div>
            {t('common.share')}
          </h3>
          <button onClick={() => setIsShareModalOpen(false)} className="size-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all hover:rotate-90"><XIcon size={20} /></button>
        </div>
        <div className="p-10 grid grid-cols-2 gap-6 bg-white">
          <button 
            onClick={() => handleShare('facebook')}
            className="flex flex-col items-center gap-4 p-6 rounded-[32px] bg-slate-50 hover:bg-blue-50 text-blue-600 transition-all group border border-transparent hover:border-blue-100"
          >
            <div className="size-14 bg-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border border-slate-100"><Facebook size={28} fill="currentColor" /></div>
            <span className="text-[11px] font-black uppercase tracking-widest">Facebook</span>
          </button>
          <button 
            onClick={() => handleShare('line')}
            className="flex flex-col items-center gap-4 p-6 rounded-[32px] bg-slate-50 hover:bg-emerald-50 text-emerald-600 transition-all group border border-transparent hover:border-emerald-100"
          >
            <div className="size-14 bg-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border border-slate-100"><MessageCircle size={28} fill="currentColor" /></div>
            <span className="text-[11px] font-black uppercase tracking-widest">Line</span>
          </button>
          <button 
            onClick={() => handleShare('twitter')}
            className="flex flex-col items-center gap-4 p-6 rounded-[32px] bg-slate-50 hover:bg-slate-100 text-slate-900 transition-all group border border-transparent hover:border-slate-200"
          >
            <div className="size-14 bg-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border border-slate-100"><Twitter size={28} fill="currentColor" /></div>
            <span className="text-[11px] font-black uppercase tracking-widest">Twitter</span>
          </button>
          <button 
            onClick={() => handleShare('copy')}
            className="flex flex-col items-center gap-4 p-6 rounded-[32px] bg-slate-50 hover:bg-blue-50 text-blue-600 transition-all group border border-transparent hover:border-blue-100"
          >
            <div className="size-14 bg-white rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border border-slate-100"><LinkIcon size={28} /></div>
            <span className="text-[11px] font-black uppercase tracking-widest">{t('common.copied').replace('!', '')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
