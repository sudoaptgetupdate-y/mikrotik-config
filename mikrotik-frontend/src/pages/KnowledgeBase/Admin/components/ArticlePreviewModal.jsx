import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Eye, Calendar, User, Clock, Tag as TagIcon, 
  ArrowUp, Share2, Bookmark, Heart, Loader2, Link as LinkIcon,
  BookOpen
} from 'lucide-react';
import articleService from '../../../../services/articleService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { getToken } from '../../../../utils/apiClient';
import { Link } from 'react-router-dom';

const ArticlePreviewRenderer = React.memo(({ content, loading }) => {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!content || loading) return;

    const timer = setTimeout(() => {
      const codeBlocks = document.querySelectorAll('.article-preview-content pre, .article-preview-content .ql-syntax, .article-preview-content .ql-code-block-container');
      
      codeBlocks.forEach(block => {
        if (block.querySelector('.copy-btn-article')) return;
        
        let codeContent = '';
        if (block.classList.contains('ql-code-block-container')) {
          const lines = block.querySelectorAll('.ql-code-block');
          codeContent = lines.length > 0 
            ? Array.from(lines).map(line => line.innerText).join('\n')
            : block.innerText;
        } else {
          codeContent = block.innerText;
        }

        block.style.setProperty('position', 'relative', 'important');
        block.classList.add('group/article-code');
        
        const btn = document.createElement('button');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy';
        btn.className = 'copy-btn-article absolute top-3 right-3 bg-slate-800/90 hover:bg-slate-700 text-white/80 hover:text-white text-[10px] font-black px-3 py-1.5 rounded-xl transition-all border border-slate-700/50 flex items-center gap-2 z-[100] uppercase tracking-widest shadow-xl backdrop-blur-md';
        
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard.writeText(codeContent);
          
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
          btn.className = 'copy-btn-article absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl z-[100] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 border border-emerald-400';
          
          setTimeout(() => {
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy';
            btn.className = 'copy-btn-article absolute top-3 right-3 bg-slate-800/90 hover:bg-slate-700 text-white/80 hover:text-white text-[10px] font-black px-3 py-1.5 rounded-xl transition-all border border-slate-700/50 flex items-center gap-2 z-[100] uppercase tracking-widest shadow-xl backdrop-blur-md';
          }, 2000);
        };
        
        block.appendChild(btn);

        const label = document.createElement('div');
        label.innerText = 'CONFIG / SCRIPT';
        label.className = 'absolute bottom-4 right-4 text-[9px] font-black text-slate-500 uppercase tracking-widest opacity-30 pointer-events-none z-10';
        block.appendChild(label);

        // Expand/Collapse Logic
        const lineCount = codeContent.split('\n').length;
        if (lineCount > 8) {
          block.style.maxHeight = '280px';
          block.style.overflow = 'hidden';
          block.style.transition = 'max-height 0.5s ease-in-out';
          
          const expandWrapper = document.createElement('div');
          expandWrapper.className = 'absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-20 flex items-end justify-center pb-4 transition-opacity duration-300';
          
          let isExpanded = false;
          const expandBtn = document.createElement('button');
          expandBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg> SHOW FULL CODE';
          expandBtn.className = 'bg-white/10 hover:bg-white/20 text-white text-[10px] font-black px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-md transition-all shadow-xl uppercase tracking-[0.2em] flex items-center active:scale-95';
          
          expandBtn.onclick = () => {
            isExpanded = !isExpanded;
            if (isExpanded) {
              block.style.maxHeight = 'none';
              expandWrapper.classList.remove('h-24', 'bg-gradient-to-t', 'from-slate-950', 'via-slate-950/80');
              expandWrapper.classList.add('h-14', 'bg-transparent', 'mt-4');
              expandBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="m17 11-5-5-5 5"/><path d="m17 17-5-5-5 5"/></svg> COLLAPSE CODE';
              expandBtn.className = 'bg-slate-800/50 hover:bg-slate-700 text-white/50 hover:text-white text-[10px] font-black px-6 py-2.5 rounded-full border border-white/5 backdrop-blur-sm transition-all uppercase tracking-[0.2em] flex items-center mx-auto';
            } else {
              block.style.maxHeight = '280px';
              expandWrapper.classList.add('h-24', 'bg-gradient-to-t', 'from-slate-950', 'via-slate-950/80');
              expandWrapper.classList.remove('h-14', 'bg-transparent', 'mt-4');
              expandBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg> SHOW FULL CODE';
              expandBtn.className = 'bg-white/10 hover:bg-white/20 text-white text-[10px] font-black px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-md transition-all shadow-xl uppercase tracking-[0.2em] flex items-center active:scale-95';
              block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          };
          
          expandWrapper.appendChild(expandBtn);
          block.appendChild(expandWrapper);
        }
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [content, loading]);

  return (
    <div ref={contentRef} dangerouslySetInnerHTML={{ __html: content }} />
  );
});

const ArticlePreviewModal = ({ isOpen, onClose, articleId }) => {
  const { t } = useTranslation();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen && articleId) {
      fetchArticle();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (!isOpen) setArticle(null);
    }
  }, [isOpen, articleId]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await articleService.getArticles();
      const articles = response.articles || [];
      const summary = articles.find(a => a.id === parseInt(articleId));
      
      if (summary && summary.slug) {
        const data = await articleService.getArticle(summary.slug);
        setArticle(data);
      }
    } catch (error) {
      console.error('Failed to fetch article preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatImageUrl = (url) => {
    if (!url) return null;
    return url;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 pointer-events-none invisible'}`}>
      <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      
      <div className={`bg-white rounded-[40px] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden relative z-10 transition-all duration-300 transform flex flex-col ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Header (Top Nav Style) */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Eye size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 tracking-tight leading-none">
                {t('articles.preview_article')}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mode: Administrative Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {article && (
              <a 
                href={`/knowledge-base/${article.slug}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition shadow-sm border border-blue-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <LinkIcon size={14} />
                {t('common.open_new_tab') || 'Open Link'}
              </a>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition border border-slate-100"><X size={20} /></button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar selection:bg-blue-100 selection:text-blue-900 p-4 sm:p-6 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 bg-white rounded-[32px] border border-slate-200">
              <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
              <p className="font-black text-sm uppercase tracking-[0.2em]">{t('common.loading')}</p>
            </div>
          ) : article ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
              
              {/* 1. Hero Header Section */}
              <header className="relative h-[250px] sm:h-[300px] group flex flex-col justify-end">
                {article.thumbnail ? (
                  <img src={formatImageUrl(article.thumbnail)} alt={article.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/30 to-transparent" />
                
                <div className="relative z-10 p-8 sm:p-10 space-y-4">
                  <div className="flex items-center gap-3">
                    {article.category && (
                      <span className="inline-block bg-blue-600 text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest shadow-lg shadow-blue-900/40">
                        {article.category.name}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-md max-w-3xl">
                    {article.title}
                  </h1>
                </div>
              </header>

              {/* 2. Meta Information Bar */}
              <div className="bg-slate-50 border-b border-slate-100 px-8 sm:px-10 py-5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="size-9 bg-white rounded-lg flex items-center justify-center text-slate-900 font-black text-sm border border-slate-200 uppercase shadow-sm">
                      {article.author?.firstName?.charAt(0) || article.author?.username?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 leading-tight">
                        {article.author?.firstName ? `${article.author.firstName} ${article.author.lastName || ''}` : article.author?.username}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {article.author?.role ? (t('users.roles.' + article.author.role.toLowerCase()) || article.author.role) : 'N/A'}
                      </div>

                    </div>
                  </div>

                  {/* Date & Views */}
                  <div className="hidden sm:flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-400 border-l border-slate-200 pl-6">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-blue-500" />
                      {format(new Date(article.createdAt), 'dd MMM yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye size={13} className="text-blue-500" />
                      {article.viewCount} {t('common.items')}
                    </div>
                  </div>
                </div>

                {/* Tags in Bridge */}
                {article.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map(tag => (
                      <span 
                        key={tag.id} 
                        className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 bg-slate-200/50 px-2 py-1 rounded-md border border-transparent"
                      >
                        <TagIcon size={10} className="opacity-40" />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Article Content Section */}
              <main className="p-8 sm:p-10 md:p-12">
                <article className="article-preview-content prose prose-slate max-w-none">
                  <ArticlePreviewRenderer content={article.content} loading={loading} />
                </article>
              </main>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[40px] border border-slate-200">
              <BookOpen size={64} className="text-slate-100 mb-4" />
              <h2 className="text-xl font-black text-slate-800 tracking-tight">{t('articles.no_articles')}</h2>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-[40px]">
          <button type="button" onClick={onClose} className="px-8 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-black transition-all text-sm font-bold shadow-lg shadow-slate-200 active:scale-95 uppercase tracking-widest">
            {t('common.close') || 'Close Preview'}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .article-preview-content {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.8;
          color: #334155;
          font-size: 1.05rem;
        }
        .article-preview-content h2 { margin-top: 3rem; margin-bottom: 1.5rem; font-weight: 900; font-size: 1.75rem; color: #0f172a; letter-spacing: -0.04em; border-left: 4px solid #3b82f6; padding-left: 1rem; }
        .article-preview-content h3 { margin-top: 2rem; margin-bottom: 1rem; font-weight: 800; font-size: 1.5rem; color: #1e293b; }
        .article-preview-content p { margin-bottom: 1.5rem; }
        .article-preview-content img { max-width: 100%; height: auto; margin: 2rem auto; border-radius: 1.5rem; box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.08); border: 4px solid white; }
        .article-preview-content blockquote { border-left: 4px solid #3b82f6; padding: 1.5rem 2rem; font-style: italic; color: #0f172a; margin: 2.5rem 0; background: #f8fafc; border-radius: 0 1.5rem 1.5rem 0; font-size: 1.125rem; }
        .article-preview-content pre,
        .article-preview-content .ql-syntax,
        .article-preview-content .ql-code-block-container { 
          background: #0f172a; 
          color: #f8fafc; 
          padding: 2rem; 
          border-radius: 1.5rem; 
          overflow-x: auto; 
          margin: 2.5rem 0;
          font-family: 'Fira Code', monospace;
          font-size: 0.85rem;
          position: relative;
          box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.2);
          line-height: 1.6;
        }
        .article-preview-content .ql-code-block {
          white-space: pre !important;
        }
        .article-preview-content code { background: #f1f5f9; color: #3b82f6; padding: 0.2rem 0.4rem; border-radius: 0.5rem; font-size: 0.85em; font-weight: 800; }
        .article-preview-content pre code { background: transparent; color: inherit; padding: 0; font-weight: 400; font-size: inherit; }
      ` }} />
    </div>
  );
};

export default ArticlePreviewModal;
