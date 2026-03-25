import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Calendar, User, Eye, Copy, Check, 
  Clock, Folder, Tag as TagIcon, ArrowUp, Share2, 
  Bookmark, Heart, BookOpen, Loader2, Link as LinkIcon,
  ChevronRight, FileText, Facebook, Twitter, Linkedin, X as XIcon,
  MessageCircle
} from 'lucide-react';
import articleService from '../../services/articleService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { getToken } from '../../utils/apiClient';
import Swal from 'sweetalert2';

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    fetchArticle();
    
    // Find the scrollable container (main tag in MainLayout)
    const mainElement = document.querySelector('main');
    
    const handleScroll = () => {
      if (mainElement) {
        setShowScrollTop(mainElement.scrollTop > 400);
      } else {
        setShowScrollTop(window.scrollY > 400);
      }
    };

    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
    }
    window.addEventListener('scroll', handleScroll);

    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [slug]);

  const formatImageUrl = (url) => {
    if (!url) return null;
    return url;
  };

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const data = await articleService.getArticle(slug);
      setArticle(data);
      
      // Fetch favorite status if we have the article ID
      if (data?.id) {
        fetchFavoriteStatus(data.id);
      }
      
      // Fetch recommended articles (Prefer same category)
      const response = await articleService.getArticles({ limit: 50 }); // Fetch more to filter
      const allArticles = response.articles || [];
      
      // Filter out current article and HIDDEN articles
      const otherArticles = allArticles.filter(a => a.id !== data.id && a.status === 'PUBLISHED');
      
      // 1. Try to get articles from same category
      const sameCategory = otherArticles.filter(a => a.categoryId === data.categoryId);
      
      // 2. Combine and take top 3 (Shuffle for variety)
      const combined = [...sameCategory, ...otherArticles.filter(a => a.categoryId !== data.categoryId)]
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) // Unique
        .slice(0, 3);
        
      setRelatedArticles(combined);

      // Scroll the container to top on initial load
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.scrollTo({ top: 0 });
      } else {
        window.scrollTo(0, 0);
      }
    } catch (error) {
      console.error('Failed to fetch article:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteStatus = async (articleId) => {
    try {
      const result = await articleService.getFavoriteStatus(articleId);
      setIsFavorited(result.isFavorited);
    } catch (error) {
      console.error('Failed to fetch favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!article?.id || togglingFavorite) return;
    
    try {
      setTogglingFavorite(true);
      const result = await articleService.toggleFavorite(article.id);
      setIsFavorited(result.isFavorited);
      
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon: 'success',
        title: result.isFavorited ? 'Added to favorites' : 'Removed from favorites'
      });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setTogglingFavorite(false);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = article?.title || 'Check out this article';
    const text = article?.excerpt || title;

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'line':
        shareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
        Toast.fire({ icon: 'success', title: t('common.copied') });
        setIsShareModalOpen(false);
        return;
      case 'native':
        if (navigator.share) {
          navigator.share({ title, text, url }).catch(console.error);
          return;
        }
        setIsShareModalOpen(true);
        return;
      default:
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      setIsShareModalOpen(false);
    }
  };

  useEffect(() => {
    if (!article) return;
    const codeBlocks = document.querySelectorAll('.article-content pre');
    codeBlocks.forEach(block => {
      if (block.querySelector('.copy-btn')) return;
      const btn = document.createElement('button');
      btn.innerHTML = 'Copy';
      btn.className = 'copy-btn absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all backdrop-blur-md border border-white/10 z-10 uppercase tracking-widest';
      block.style.position = 'relative';
      btn.onclick = () => {
        const text = block.innerText.replace('Copy', '');
        navigator.clipboard.writeText(text);
        btn.innerHTML = 'Copied!';
        btn.className = 'copy-btn absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg z-10 uppercase tracking-widest';
        setTimeout(() => {
          btn.innerHTML = 'Copy';
          btn.className = 'copy-btn absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all backdrop-blur-md border border-white/10 z-10 uppercase tracking-widest';
        }, 2000);
      };
      block.appendChild(btn);
    });
  }, [article, loading]);

  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-8 sm:py-12 space-y-8">
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 animate-pulse space-y-4">
          <div className="h-4 w-24 bg-slate-100 rounded-full"></div>
          <div className="h-10 w-full bg-slate-100 rounded-2xl"></div>
          <div className="h-10 w-2/3 bg-slate-100 rounded-2xl"></div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 animate-pulse h-96"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="bg-slate-50 p-8 rounded-[40px] mb-6 border border-slate-100">
          <BookOpen size={64} className="text-slate-200" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('articles.no_articles')}</h2>
        <button onClick={() => navigate('/knowledge-base')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest mt-8 text-xs transition-transform active:scale-95 shadow-xl shadow-slate-200">
          {t('articles.back_to_kb')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-900 selection:bg-blue-100 selection:text-blue-900 pb-10">
      
      {/* 1. Top Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Link 
          to="/knowledge-base" 
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors group bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm"
        >
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          {t('sidebar.knowledge_base')}
        </Link>
        <div className="flex gap-2">
            <button 
              onClick={() => handleShare('native')}
              className="size-9 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm active:scale-90"
            >
              <Share2 size={16} />
            </button>
            <button 
              onClick={handleToggleFavorite}
              disabled={togglingFavorite}
              className={`size-9 rounded-xl flex items-center justify-center border transition-all shadow-sm active:scale-90 ${isFavorited ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-white border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100'}`}
            >
              <Heart size={16} fill={isFavorited ? "currentColor" : "none"} className={togglingFavorite ? 'animate-pulse' : ''} />
            </button>
        </div>
      </div>

      {/* Unified Master Card */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl shadow-slate-900/5 overflow-hidden">
        
        {/* 2. Header Section (Compact Background) */}
        <header className="relative h-[250px] sm:h-[300px] group flex flex-col justify-end">
          {/* Background Image */}
          {article.thumbnail ? (
            <img 
              src={formatImageUrl(article.thumbnail)} 
              alt={article.title} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
          )}

          {/* Strong Gradient for Title Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/30 to-transparent" />
          
          {/* Header Content (Bottom Aligned) */}
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

        {/* 3. Meta Information Bar (The Bridge with Tags) */}
        <div className="bg-slate-50 border-b border-slate-100 px-8 sm:px-10 py-5 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-8">
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
            <div className="hidden sm:flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-400 border-l border-slate-200 pl-8">
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
                <Link 
                  key={tag.id} 
                  to={`/knowledge-base?search=${tag.name}`} 
                  className="text-slate-400 hover:text-blue-600 text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 bg-slate-200/50 hover:bg-blue-50 px-2 py-1 rounded-md border border-transparent hover:border-blue-100"
                >
                  <TagIcon size={10} className="opacity-40" />
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 4. Article Content Section */}
        <main className="p-8 sm:p-10 md:p-12">
          <article className="article-content prose prose-slate max-w-none">
            <div ref={contentRef} dangerouslySetInnerHTML={{ __html: article.content }} />
          </article>
        </main>

        {/* 5. Explore More (Integrated Section) */}
        {relatedArticles.length > 0 && (
          <section className="bg-slate-50/50 border-t border-slate-100 p-8 sm:p-10 md:p-12">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                 <BookOpen size={20} className="text-blue-600" />
                 {t('articles.footer_title')}
               </h3>
               <Link to="/knowledge-base" className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-2">
                 {t('common.view')} {t('sidebar.knowledge_base')} <ChevronRight size={12} />
               </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map(item => (
                <Link 
                  key={item.id} 
                  to={`/knowledge-base/${item.slug}`}
                  className="group flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                    {item.thumbnail ? (
                      <img src={formatImageUrl(item.thumbnail)} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300"><FileText size={32} /></div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h4 className="font-bold text-sm text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors mb-2">
                      {item.title}
                    </h4>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {item.category?.name || t('articles.uncategorized')}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400">{format(new Date(item.createdAt), 'dd MMM yyyy')}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 6. Footer Navigation (Inside Master Card) */}
        <footer className="bg-slate-100/50 border-t border-slate-200/60 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {t('articles.last_updated')}: {format(new Date(article.updatedAt), 'dd MMM yyyy')}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/knowledge-base')}
              className="px-6 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-200 transition-all active:scale-95 shadow-sm"
            >
              {t('articles.back_to_kb')}
            </button>
            <button 
              onClick={scrollToTop}
              className="px-6 py-3 bg-slate-900 text-white hover:bg-black rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-2"
            >
              {t('articles.back_to_top')}
              <ArrowUp size={14} />
            </button>
          </div>
        </footer>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)} />
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">{t('common.share') || 'Share Article'}</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-600"><XIcon size={20} /></button>
            </div>
            <div className="p-8 grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleShare('facebook')}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all group"
              >
                <div className="size-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><Facebook size={24} fill="currentColor" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Facebook</span>
              </button>
              <button 
                onClick={() => handleShare('line')}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all group"
              >
                <div className="size-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><MessageCircle size={24} fill="currentColor" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Line</span>
              </button>
              <button 
                onClick={() => handleShare('twitter')}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-900 transition-all group"
              >
                <div className="size-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><Twitter size={24} fill="currentColor" /></div>
                <span className="text-[10px] font-black uppercase tracking-widest">X / Twitter</span>
              </button>
              <button 
                onClick={() => handleShare('copy')}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all group"
              >
                <div className="size-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><LinkIcon size={24} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll Top */}
      <button 
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 size-12 sm:size-14 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 z-50 hover:bg-slate-900 hover:text-white hover:-translate-y-2 active:scale-90 border border-slate-100 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
      >
        <ArrowUp size={20} />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .article-content {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          line-height: 1.8;
          color: #334155;
          font-size: 1.05rem;
        }
        .article-content h2 { margin-top: 3rem; margin-bottom: 1.5rem; font-weight: 900; font-size: 1.85rem; color: #0f172a; letter-spacing: -0.04em; border-left: 4px solid #3b82f6; padding-left: 1rem; }
        .article-content h3 { margin-top: 2rem; margin-bottom: 1rem; font-weight: 800; font-size: 1.5rem; color: #1e293b; }
        .article-content p { margin-bottom: 1.5rem; }
        .article-content img { max-width: 100%; height: auto; margin: 2rem auto; border-radius: 1.5rem; box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.08); border: 4px solid white; }
        .article-content blockquote { border-left: 4px solid #3b82f6; padding: 1.5rem 2rem; font-style: italic; color: #0f172a; margin: 2.5rem 0; background: #f8fafc; border-radius: 0 1.5rem 1.5rem 0; font-size: 1.125rem; }
        .article-content pre { 
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
        .article-content code { background: #f1f5f9; color: #3b82f6; padding: 0.2rem 0.4rem; border-radius: 0.5rem; font-size: 0.85em; font-weight: 800; }
        .article-content pre code { background: transparent; color: inherit; padding: 0; font-weight: 400; font-size: inherit; }
      ` }} />
    </div>
  );
};

export default ArticleDetail;
