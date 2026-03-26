import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Eye, MessageCircle, Tag as TagIcon, Share2, Heart } from 'lucide-react';

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
    <header className="relative min-h-[450px] sm:min-h-[550px] md:min-h-[600px] group flex flex-col justify-end overflow-hidden">
      {article.thumbnail ? (
        <img 
          src={formatImageUrl(article.thumbnail)} 
          alt={article.title} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" 
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
      )}
      
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 to-transparent" />
      
      {/* 1. Title & Category Area */}
      <div className="relative z-10 px-8 sm:px-12 pt-20 pb-8 mt-auto space-y-6">
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
          {article.category && (
            <span className="inline-block bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-2xl shadow-blue-600/40">
              {article.category.name}
            </span>
          )}
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.05] tracking-tight drop-shadow-2xl max-w-4xl animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
          {article.title}
        </h1>
      </div>

      {/* 2. Integrated Meta Bar (Using standard flow to avoid overlapping) */}
      <div className="relative z-20 bg-slate-950/40 backdrop-blur-2xl border-t border-white/10 px-8 sm:px-12 py-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-10 flex-1 min-w-0">
          {/* Author Info */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center text-white font-black text-lg border border-white/20 uppercase shadow-xl backdrop-blur-md">
              {article.author?.firstName?.charAt(0) || article.author?.username?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block">
              <div className="text-[15px] font-black text-white leading-tight">
                {article.author?.firstName ? `${article.author.firstName} ${article.author.lastName || ''}` : article.author?.username}
              </div>
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                {article.author?.role ? (t('users.roles.' + article.author.role.toLowerCase()) || article.author.role) : 'N/A'}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-col justify-center flex-1 border-l border-white/10 pl-10 gap-3 min-w-0">
            {/* Stats (Top Row) */}
            <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <Calendar size={16} className="text-blue-400" />
                {format(new Date(article.createdAt), 'dd MMM yyyy')}
              </div>
              <div className="flex items-center gap-2.5">
                <Eye size={16} className="text-blue-400" />
                {article.viewCount} {t('common.views')}
              </div>
              <button 
                onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2.5 hover:text-white transition-all group/meta-comm cursor-pointer"
              >
                <MessageCircle size={16} className="text-blue-400 group-hover/meta-comm:scale-110 transition-transform" />
                <span className="border-b border-transparent group-hover/meta-comm:border-white/40">
                  {commentsCount} {t('common.comments')}
                </span>
              </button>
            </div>

            {/* Tags (Bottom Row - with better wrapping) */}
            {article.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <Link 
                    key={tag.id} 
                    to={`/knowledge-base?search=${tag.name}`} 
                    className="text-slate-200 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 bg-white/10 hover:bg-blue-600 px-3.5 py-1.5 rounded-xl border border-white/5 backdrop-blur-md whitespace-nowrap"
                  >
                    <TagIcon size={12} className="opacity-60" />
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/10 p-2 rounded-[20px] border border-white/10 shadow-xl shrink-0 backdrop-blur-md">
            <button 
              onClick={() => handleShare('native')}
              className="size-11 rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              title={t('common.share')}
            >
              <Share2 size={20} />
            </button>
            <div className="w-px h-6 bg-white/10" />
            <button 
              onClick={handleToggleFavorite}
              disabled={togglingFavorite}
              className={`size-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isFavorited ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/40' : 'text-slate-200 hover:text-rose-400 hover:bg-rose-500/10'}`}
              title={isFavorited ? t('common.delete') : t('common.save')}
            >
              <Heart size={20} fill={isFavorited ? "currentColor" : "none"} className={togglingFavorite ? 'animate-pulse' : ''} />
            </button>
        </div>
      </div>
    </header>
  );
};

export default ArticleHeader;
