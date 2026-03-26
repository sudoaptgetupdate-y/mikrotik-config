import React from 'react';
import { List, X as XIcon, Hash, MessageCircle } from 'lucide-react';

const ArticleToc = ({ 
  isTocOpen, 
  setIsTocOpen, 
  toc, 
  activeId, 
  scrollToSection, 
  readingProgress, 
  commentsCount, 
  t 
}) => {
  return (
    <>
      <div className={`fixed top-1/2 -translate-y-1/2 right-8 z-[100] transition-all duration-700 hidden lg:block ${isTocOpen ? 'translate-x-0 opacity-100' : 'translate-x-[calc(100%+40px)] opacity-0 pointer-events-none'}`}>
        <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/20 w-64 overflow-hidden flex flex-col max-h-[70vh] shadow-slate-900/20">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="size-6 bg-slate-900 rounded-lg flex items-center justify-center text-white"><List size={12} /></div>
                {t('articles.toc')}
              </span>
              <button 
                onClick={() => setIsTocOpen(false)}
                className="size-8 bg-white rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-900 border border-slate-100 transition-all hover:rotate-90"
              >
                <XIcon size={14} />
              </button>
          </div>

          {toc.length > 0 && (
            <div className="p-3 overflow-y-auto custom-scrollbar border-b border-slate-50 bg-white/50">
              <nav className="space-y-1">
                {toc.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left text-[11px] py-2.5 px-4 rounded-xl transition-all flex gap-3 group ${activeId === item.id ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-100'}`}
                  >
                    <span className={`shrink-0 transition-colors mt-0.5 ${activeId === item.id ? 'text-white' : 'text-slate-300 group-hover:text-blue-500'}`}>
                      {item.level === 'h2' ? <Hash size={12} /> : <div className="size-1.5 rounded-full bg-current ml-1" />}
                    </span>
                    <span className="line-clamp-2 leading-tight uppercase tracking-tight">{item.text}</span>
                  </button>
                ))}
              </nav>
            </div>
          )}

          <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-baseline gap-1.5 ml-2">
                <span className="text-lg font-black">{Math.round(readingProgress)}%</span>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">READ</span>
              </div>
              <button 
                onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="size-10 rounded-xl bg-white/10 hover:bg-blue-600 flex items-center justify-center transition-all group relative"
                title={t('common.comments')}
              >
                <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                {commentsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 size-5 bg-blue-500 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-slate-950 shadow-lg">
                    {commentsCount}
                  </span>
                )}
              </button>
          </div>
        </div>
      </div>

      <button 
        onClick={() => setIsTocOpen(true)}
        className={`fixed top-1/2 -translate-y-1/2 right-8 size-12 bg-slate-950 text-white rounded-2xl hidden lg:flex items-center justify-center shadow-2xl transition-all duration-700 hover:bg-blue-600 z-[90] ${!isTocOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-50 translate-x-10 pointer-events-none'}`}
        title={t('articles.toc')}
      >
        <List size={20} />
        <div className="absolute -top-1.5 -right-1.5 size-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
          <div className="size-1.5 bg-white rounded-full animate-pulse" />
        </div>
      </button>
    </>
  );
};

export default ArticleToc;
