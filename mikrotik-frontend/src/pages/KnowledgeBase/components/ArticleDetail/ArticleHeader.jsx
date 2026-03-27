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
    <header className="relative min-h-[300px] sm:min-h-[400px] group flex flex-col justify-end overflow-hidden">
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
      <div className="relative z-10 px-6 sm:px-10 pt-12 pb-6 mt-auto space-y-3">
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
          {article.category && (
            <span className="inline-block bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-blue-600/30">
              {article.category.name}
            </span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-xl max-w-4xl animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
          {article.title}
        </h1>
      </div>

      {/* 2. Integrated Meta Bar */}
      <div className="relative z-20 bg-slate-950/40 backdrop-blur-xl border-t border-white/10 px-6 sm:px-10 py-5 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-8 flex-1 min-w-0">
          {/* Author Info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center text-white font-black text-base border border-white/20 uppercase shadow-lg backdrop-blur-md">
              {article.author?.firstName?.charAt(0) || article.author?.username?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-black text-white leading-tight">
                {article.author?.firstName ? `${article.author.firstName} ${article.author.lastName || ''}` : article.author?.username}
              </div>
              <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                {article.author?.role ? (t('users.roles.' + article.author.role.toLowerCase()) || article.author.role) : 'N/A'}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center flex-1 border-l border-white/10 pl-8 gap-8 min-w-0">
            {/* Stats (Row) */}
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-blue-400" />
                {format(new Date(article.createdAt), 'dd MMM yyyy')}
              </div>
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-blue-400" />
                {article.viewCount} {t('common.views')}
              </div>
              <button 
                onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 hover:text-white transition-all group/meta-comm cursor-pointer"
              >
                <MessageCircle size={14} className="text-blue-400 group-hover/meta-comm:scale-110 transition-transform" />
                <span className="border-b border-transparent group-hover/meta-comm:border-white/40">
                  {commentsCount} {t('common.comments')}
                </span>
              </button>
            </div>

            {/* Tags */}
            {article.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {article.tags.slice(0, 3).map(tag => (
                  <Link 
                    key={tag.id} 
                    to={`/knowledge-base?search=${tag.name}`} 
                    className="text-slate-300 hover:text-white text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 bg-white/5 hover:bg-blue-600 px-2.5 py-1 rounded-lg border border-white/5 backdrop-blur-md whitespace-nowrap"
                  >
                    <TagIcon size={10} className="opacity-60" />
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/10 shadow-lg shrink-0 backdrop-blur-md">
            <button 
              onClick={() => handleShare('native')}
              className="size-9 rounded-lg flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              title={t('common.share')}
            >
              <Share2 size={18} />
            </button>
            <div className="w-px h-5 bg-white/10" />
            <button 
              onClick={handleToggleFavorite}
              disabled={togglingFavorite}
              className={`size-9 rounded-lg flex items-center justify-center transition-all active:scale-90 ${isFavorited ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40' : 'text-slate-200 hover:text-rose-400 hover:bg-rose-500/10'}`}
              title={isFavorited ? t('common.delete') : t('common.save')}
            >
              <Heart size={18} fill={isFavorited ? "currentColor" : "none"} className={togglingFavorite ? 'animate-pulse' : ''} />
            </button>
        </div>
      </div>
    </header>
  );
};

export default ArticleHeader;
