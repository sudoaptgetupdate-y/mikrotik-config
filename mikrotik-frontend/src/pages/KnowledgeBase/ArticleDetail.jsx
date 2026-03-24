import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Calendar, User, Eye, Copy, Check, 
  Clock, Folder, Tag as TagIcon, ArrowUp
} from 'lucide-react';
import articleService from '../../services/articleService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { getToken } from '../../utils/apiClient';
import 'quill/dist/quill.snow.css'; 

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const formatImageUrl = (url) => {
    if (!url) return null;
    if (url.includes('/api/articles/images/')) {
      const token = getToken();
      const separator = url.includes('?') ? '&' : '?';
      return url.includes('token=') ? url : `${url}${separator}token=${token}`;
    }
    return url;
  };

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const data = await articleService.getArticle(slug);
      
      const token = getToken();
      if (token && data.content) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.content;
        tempDiv.querySelectorAll('img').forEach(img => {
          if (img.src.includes('/api/articles/images/')) {
            const separator = img.src.includes('?') ? '&' : '?';
            if (!img.src.includes('token=')) img.src = `${img.src}${separator}token=${token}`;
          }
        });
        data.content = tempDiv.innerHTML;
      }

      setArticle(data);
    } catch (error) {
      console.error('Failed to fetch article:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!article) return;
    const codeBlocks = document.querySelectorAll('.article-content pre');
    codeBlocks.forEach(block => {
      if (block.querySelector('.copy-btn')) return;
      const btn = document.createElement('button');
      btn.innerHTML = 'Copy';
      btn.className = 'copy-btn absolute top-3 right-3 bg-slate-700/50 hover:bg-slate-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all backdrop-blur-md border border-white/10';
      block.style.position = 'relative';
      btn.onclick = () => {
        const text = block.innerText.replace('Copy', '');
        navigator.clipboard.writeText(text);
        btn.innerHTML = 'Copied!';
        btn.className = 'copy-btn absolute top-3 right-3 bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg';
        setTimeout(() => {
          btn.innerHTML = 'Copy';
          btn.className = 'copy-btn absolute top-3 right-3 bg-slate-700/50 hover:bg-slate-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all backdrop-blur-md border border-white/10';
        }, 2000);
      };
      block.appendChild(btn);
    });
  }, [article, loading]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-pulse space-y-8">
        <div className="h-4 w-24 bg-slate-200 rounded-lg"></div>
        <div className="space-y-4">
          <div className="h-12 bg-slate-200 rounded-2xl w-3/4"></div>
          <div className="h-6 bg-slate-100 rounded-lg w-1/4"></div>
        </div>
        <div className="aspect-[21/9] bg-slate-200 rounded-3xl"></div>
        <div className="space-y-4">
          <div className="h-4 bg-slate-100 rounded w-full"></div>
          <div className="h-4 bg-slate-100 rounded w-full"></div>
          <div className="h-4 bg-slate-100 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center text-slate-900">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t('articles.no_articles')}</h2>
        <Link to="/knowledge-base" className="text-blue-600 font-bold hover:underline mt-6 flex items-center gap-2">
          <ChevronLeft size={20} />
          {t('articles.back_to_kb')}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/knowledge-base')}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-all font-bold text-sm bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm shadow-blue-900/5 active:scale-95"
          >
            <ChevronLeft size={18} />
            {t('common.back')}
          </button>
          
          <div className="hidden sm:flex items-center gap-4 text-slate-400 text-xs font-bold uppercase tracking-widest bg-white/50 px-4 py-2 rounded-2xl border border-slate-100">
            <span className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
              <Calendar size={14} className="text-slate-300" />
              {format(new Date(article.createdAt), 'dd MMM yyyy')}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye size={14} className="text-slate-300" />
              {article.viewCount} {t('common.items').toLowerCase()}
            </span>
          </div>
        </div>

        {/* Article Card */}
        <article className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Cover Image */}
          {article.thumbnail && (
            <div className="aspect-[21/9] overflow-hidden bg-slate-50 border-b border-slate-100">
              <img 
                src={formatImageUrl(article.thumbnail)} 
                alt={article.title} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}

          <div className="p-6 md:p-16">
            {/* Header Info */}
            <header className="mb-12 space-y-6">
              <div className="flex flex-wrap gap-2">
                 {article.category && (
                   <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-[0.2em] shadow-lg shadow-blue-200 border border-blue-500/20 flex items-center gap-2">
                     <Folder size={12} />
                     {article.category.name}
                   </span>
                 )}
                 {article.tags?.map(tag => (
                   <span key={tag.id} className="bg-slate-100 text-slate-500 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest flex items-center gap-2 border border-slate-200/50 hover:bg-slate-200 transition-colors cursor-default">
                     <TagIcon size={12} />
                     {tag.name}
                   </span>
                 ))}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                {article.title}
              </h1>
              
              <div className="flex items-center gap-4 pt-8 border-t border-slate-50">
                 <div className="size-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-200 border-2 border-white">
                    {article.author?.firstName?.charAt(0) || 'A'}
                 </div>
                 <div>
                    <div className="text-lg font-black text-slate-800">{article.author?.firstName} {article.author?.lastName}</div>
                    <div className="text-sm font-bold text-slate-400">@{article.author?.username}</div>
                 </div>
              </div>
            </header>

            {/* Article Body */}
            <div className="article-content prose prose-slate max-w-none prose-img:rounded-[32px] prose-pre:rounded-[24px] prose-a:text-blue-600 prose-a:font-black">
              <div dangerouslySetInnerHTML={{ __html: article.content }} />
            </div>

            {/* Footer */}
            <footer className="mt-20 pt-10 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
                   <Clock size={16} className="text-slate-300" />
                   {t('articles.last_updated')}: {format(new Date(article.updatedAt), 'dd MMM yyyy HH:mm')}
                </div>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-[0.2em] hover:text-indigo-600 transition-all hover:bg-blue-50 px-6 py-3 rounded-2xl"
                >
                  {t('articles.back_to_top')}
                  <ArrowUp size={18} />
                </button>
            </footer>
          </div>
        </article>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .article-content {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.8;
          color: #334155;
          font-size: 1.125rem;
        }
        .article-content h2 { margin-top: 3rem; margin-bottom: 1.5rem; font-weight: 900; font-size: 2rem; color: #0f172a; letter-spacing: -0.025em; }
        .article-content h3 { margin-top: 2rem; margin-bottom: 1rem; font-weight: 800; font-size: 1.5rem; color: #1e293b; }
        .article-content p { margin-bottom: 1.5rem; }
        .article-content ul, .article-content ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
        .article-content li { margin-bottom: 0.75rem; }
        .article-content img { max-width: 100%; height: auto; margin: 3rem auto; border-radius: 2rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); border: 8px solid white; }
        .article-content blockquote { border-left: 6px solid #e2e8f0; padding: 1.5rem 2rem; font-style: italic; color: #475569; margin: 2rem 0; background: #f8fafc; border-radius: 0 2rem 2rem 0; font-size: 1.25rem; }
        .article-content pre { 
          background: #0f172a; 
          color: #f8fafc; 
          padding: 2rem; 
          border-radius: 1.5rem; 
          overflow-x: auto; 
          margin: 2.5rem 0;
          font-family: 'Fira Code', 'Roboto Mono', monospace;
          font-size: 0.95rem;
          position: relative;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          line-height: 1.6;
        }
        .article-content code { background: #fee2e2; color: #dc2626; padding: 0.2rem 0.5rem; border-radius: 0.5rem; font-size: 0.9em; font-weight: 700; }
        .article-content pre code { background: transparent; color: inherit; padding: 0; font-weight: 400; }
        .ql-syntax { background: #0f172a; color: #f8fafc; padding: 2rem; border-radius: 1.5rem; margin: 2.5rem 0; font-family: 'Fira Code', monospace; }
      ` }} />
    </div>
  );
};

export default ArticleDetail;
