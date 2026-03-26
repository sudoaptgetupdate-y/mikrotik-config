import React from 'react';
import { X as XIcon, Share2, Facebook, Twitter, Link as LinkIcon, MessageCircle, Copy, Check } from 'lucide-react';

const ShareModal = ({ isShareModalOpen, setIsShareModalOpen, handleShare, t }) => {
  const [copied, setCopied] = React.useState(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (!isShareModalOpen) return null;

  const onCopy = () => {
    handleShare('copy');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={() => setIsShareModalOpen(false)} 
      />
      
      {/* Modal Card */}
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[420px] relative z-10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Share2 size={16} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">
              {t('common.share_article') || 'Share Article'}
            </h3>
          </div>
          <button 
            onClick={() => setIsShareModalOpen(false)} 
            className="size-8 bg-white rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 shadow-sm border border-slate-100 transition-all active:scale-90"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Social Options */}
        <div className="p-8">
          <div className="grid grid-cols-3 gap-4 mb-8">
            <button 
              onClick={() => handleShare('facebook')}
              className="flex flex-col items-center gap-2 group transition-all"
            >
              <div className="size-14 bg-[#1877F2]/5 group-hover:bg-[#1877F2] text-[#1877F2] group-hover:text-white rounded-2xl flex items-center justify-center transition-all group-active:scale-95 shadow-sm">
                <Facebook size={24} fill="currentColor" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Facebook</span>
            </button>
            
            <button 
              onClick={() => handleShare('line')}
              className="flex flex-col items-center gap-2 group transition-all"
            >
              <div className="size-14 bg-[#06C755]/5 group-hover:bg-[#06C755] text-[#06C755] group-hover:text-white rounded-2xl flex items-center justify-center transition-all group-active:scale-95 shadow-sm">
                <MessageCircle size={24} fill="currentColor" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Line</span>
            </button>

            <button 
              onClick={() => handleShare('twitter')}
              className="flex flex-col items-center gap-2 group transition-all"
            >
              <div className="size-14 bg-slate-900/5 group-hover:bg-slate-900 text-slate-900 group-hover:text-white rounded-2xl flex items-center justify-center transition-all group-active:scale-95 shadow-sm">
                <Twitter size={24} fill="currentColor" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">X (Twitter)</span>
            </button>
          </div>

          {/* URL Copy Section */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              {t('common.copy_link') || 'Copy Link'}
            </p>
            <div className="flex items-center gap-2 p-1.5 pl-4 bg-slate-50 border border-slate-200 rounded-2xl group focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
              <div className="text-slate-400 shrink-0"><LinkIcon size={14} /></div>
              <input 
                type="text" 
                readOnly 
                value={currentUrl}
                className="bg-transparent border-none outline-none text-[13px] text-slate-600 font-medium flex-1 truncate select-all"
              />
              <button 
                onClick={onCopy}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  copied 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                  : 'bg-white text-blue-600 hover:bg-blue-600 hover:text-white border border-slate-200 shadow-sm'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t('common.copied') : t('common.copy')}
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {t('common.share_desc') || 'Share this knowledge with your network'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
