import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Eye, MessageCircle, Tag as TagIcon, Share2, Heart, CheckCircle2 } from 'lucide-react';

const ArticleHeader = ({ 
  article, 
  commentsCount, 
  isFavorited, 
  togglingFavorite, 
  handleToggleFavorite, 
  handleShare, 
  t, 
  formatImageUrl 
}) => {
  if (!article) return null;

  return (
    <div className="w-full bg-white">
      {/* 1. Feature Image (Conditional) */}
      {article.thumbnail && (
        <div className="w-full h-[300px] sm:h-[400px] relative group overflow-hidden">
          <img 
            src={formatImageUrl(article.thumbnail)} 
            alt={article.title} 
            className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" 
          />
          {/* Seamless Blend Gradient - Fades Image into White Background */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          
          {/* Floating Category */}
          {article.category && (
            <div className="absolute top-8 left-8 animate-in fade-in slide-in-from-top-4 duration-1000">
               <span className="px-5 py-2.5 rounded-2xl bg-slate-900/40 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-[0.2em] border border-white/10 shadow-2xl">
                {article.category.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. Content Area */}
      <div className="px-8 sm:px-12 md:px-16 lg:px-20 pt-12 pb-16">
        {/* Breadcrumb style category if no thumbnail */}
        {!article.thumbnail && article.category && (
          <div className="flex items-center gap-3 mb-8">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-lg">
              {article.category.name}
            </span>
            <div className="h-px w-8 bg-slate-200" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Documentation
            </span>
          </div>
        )}

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-[1000] text-slate-900 leading-[1.1] tracking-tight mb-12 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          {article.title}
        </h1>

        {/* Meta Bar - Balanced & Sectioned Layout */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-10 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-8">
            {/* Section 1: Identity & Timing */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="size-14 bg-slate-900 rounded-[22px] flex items-center justify-center text-white font-black text-xl uppercase shadow-xl shadow-slate-900/10 border-2 border-white">
                  {article.author?.firstName?.charAt(0) || article.author?.username?.charAt(0) || 'A'}
                </div>
                <div className="absolute -bottom-1 -right-1 size-5 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                    <CheckCircle2 size={10} className="text-white" />
                </div>
              </div>
              <div>
                <div className="text-[13px] font-[1000] text-slate-900 uppercase tracking-wider">
                    {article.author?.firstName ? `${article.author.firstName} ${article.author.lastName || ''}` : article.author?.username}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                    <Calendar size={12} className="text-blue-600/40" />
                    {format(new Date(article.createdAt), 'MMM dd, yyyy')}
                </div>
              </div>
            </div>

            {/* Vertical Divider (Desktop) */}
            <div className="hidden md:block h-10 w-px bg-slate-100" />

            {/* Section 2: Engagement Stats */}
            <div className="flex items-center gap-8">
                <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('articles.views')}</span>
                    <div className="flex items-center gap-2 text-slate-700 font-extrabold text-[14px]">
                        <Eye size={14} className="text-blue-600/60" />
                        {article.viewCount.toLocaleString()}
                    </div>
                </div>

                <button 
                    onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex flex-col gap-1 group/meta transition-all"
                >
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover/meta:text-blue-600">{t('articles.responses')}</span>
                    <div className="flex items-center gap-2 text-slate-700 font-extrabold text-[14px] group-hover/meta:text-blue-600">
                        <MessageCircle size={14} className="text-blue-600/60 group-hover/meta:text-blue-600" />
                        {commentsCount}
                    </div>
                </button>
            </div>

            {/* Vertical Divider (Large Desktop) */}
            {article.tags?.length > 0 && <div className="hidden xl:block h-10 w-px bg-slate-100" />}

            {/* Section 3: Topics (Tags) */}
            {article.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 max-w-[350px]">
                {article.tags.map(tag => (
                  <Link 
                    key={tag.id} 
                    to={`/knowledge-base?search=${tag.name}`} 
                    className="text-slate-500 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 bg-slate-50 hover:bg-blue-600 px-3 py-1.5 rounded-xl border border-slate-100 hover:border-blue-600 active:scale-95"
                  >
                    <TagIcon size={10} className="opacity-40" />
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Actions (Aligned Right) */}
          <div className="flex items-center gap-3 self-end lg:self-center">
            <button 
              onClick={() => handleShare('native')}
              className="h-12 w-12 lg:w-auto lg:px-6 rounded-2xl bg-slate-50 hover:bg-slate-200 text-slate-600 transition-all flex items-center justify-center gap-3 border border-slate-100 active:scale-95 group/share"
            >
              <Share2 size={18} className="group-hover/share:text-blue-600 transition-colors" />
              <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">{t('common.share')}</span>
            </button>
            
            <button 
              onClick={handleToggleFavorite}
              disabled={togglingFavorite}
              className={`h-12 px-6 rounded-2xl flex items-center gap-3 transition-all active:scale-95 border font-black text-[10px] uppercase tracking-widest ${isFavorited ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white border-slate-200 text-slate-600 hover:border-rose-500 hover:text-rose-500'}`}
            >
              <Heart size={18} fill={isFavorited ? "currentColor" : "none"} className={togglingFavorite ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">{isFavorited ? t('articles.saved') : t('articles.save')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleHeader;
