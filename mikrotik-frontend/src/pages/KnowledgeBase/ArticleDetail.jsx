import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Loader2, ArrowUp, List, Clock } from 'lucide-react';
import articleService from '../../services/articleService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';

// Sub-components
import ArticleHeader from './components/ArticleDetail/ArticleHeader';
import CommentSection from './components/ArticleDetail/CommentSection';
import RelatedArticles from './components/ArticleDetail/RelatedArticles';
import ArticleToc from './components/ArticleDetail/ArticleToc';
import ShareModal from './components/ArticleDetail/ShareModal';

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Article State
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  
  // UI State
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [toc, setToc] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [isTocOpen, setIsTocOpen] = useState(true);
  
  // Comment State
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Refs
  const contentRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const hasFetchedRef = useRef(false);

  const emojis = ['😀', '😂', '😍', '😮', '😢', '😡', '👍', '👎', '🙌', '👏', '🔥', '✨', '💡', '✅', '❌', '🚀', '💻', '⚙️', '📡', '🔒'];

  useEffect(() => {
    if (hasFetchedRef.current !== slug) {
      fetchArticle();
      hasFetchedRef.current = slug;
    }
  }, [slug]);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    const handleScroll = () => {
      const element = mainElement || window;
      const scrollTop = mainElement ? mainElement.scrollTop : window.scrollY;
      const scrollHeight = mainElement ? mainElement.scrollHeight : document.documentElement.scrollHeight;
      const clientHeight = mainElement ? mainElement.clientHeight : window.innerHeight;

      setShowScrollTop(scrollTop > 400);
      const totalScroll = scrollHeight - clientHeight;
      if (totalScroll > 0) {
        setReadingProgress(Math.min((scrollTop / totalScroll) * 100, 100));
      }

      if (article) {
        const headings = document.querySelectorAll('.article-content h2, .article-content h3');
        let currentActive = '';
        headings.forEach((heading) => {
          if (heading.getBoundingClientRect().top < 150) currentActive = heading.id;
        });
        setActiveId(currentActive);
      }
    };

    window.addEventListener('scroll', handleScroll);
    if (mainElement) mainElement.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainElement) mainElement.removeEventListener('scroll', handleScroll);
    };
  }, [slug, article, loading]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) setIsEmojiPickerOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const data = await articleService.getArticle(slug);
      setArticle({ ...data, content: processHeadings(data.content) });
      setToc(generateToC(data.content));
      if (data?.id) {
        fetchFavoriteStatus(data.id);
        fetchComments(data.id);
      }
      const response = await articleService.getArticles({ limit: 50 });
      const others = (response.articles || []).filter(a => a.id !== data.id && a.status === 'PUBLISHED');
      const sameCat = others.filter(a => a.categoryId === data.categoryId);
      setRelatedArticles([...sameCat, ...others.filter(a => a.categoryId !== data.categoryId)].slice(0, 3));
      window.scrollTo(0, 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processHeadings = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('h2, h3').forEach((h, i) => {
      h.id = h.innerText.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || `section-${i}`;
    });
    return div.innerHTML;
  };

  const generateToC = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return Array.from(div.querySelectorAll('h2, h3')).map((h, i) => ({
      id: h.innerText.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || `section-${i}`,
      text: h.innerText,
      level: h.tagName.toLowerCase()
    }));
  };

  const fetchFavoriteStatus = async (id) => {
    try {
      const res = await articleService.getFavoriteStatus(id);
      setIsFavorited(res.isFavorited);
    } catch (e) {}
  };

  const fetchComments = async (id) => {
    try {
      const data = await articleService.getComments(id);
      setComments(data);
    } catch (e) {}
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    try {
      setSubmittingComment(true);
      const newComment = await articleService.createComment(article.id, { content: commentText, parentId: replyTo?.id || null });
      if (replyTo) {
        setComments(prev => prev.map(c => c.id === replyTo.id ? { ...c, replies: [...(c.replies || []), newComment] } : c));
      } else {
        setComments(prev => [newComment, ...prev]);
      }
      setCommentText('');
      setReplyTo(null);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t('articles.comment_posted'), showConfirmButton: false, timer: 2000 });
    } catch (e) {} finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (id, isReply = false, parentId = null) => {
    const res = await Swal.fire({
      title: t('articles.delete_comment_title'), text: t('articles.delete_comment_text'), icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#0f172a', cancelButtonColor: '#f1f5f9',
      confirmButtonText: t('articles.delete_comment_confirm'), cancelButtonText: t('common.cancel')
    });
    if (res.isConfirmed) {
      try {
        await articleService.deleteComment(id);
        if (isReply && parentId) {
          setComments(prev => prev.map(c => c.id === parentId ? { ...c, replies: c.replies.filter(r => r.id !== id) } : c));
        } else {
          setComments(prev => prev.filter(c => c.id !== id));
        }
        
        const Toast = Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: '#ffffff',
          color: '#0f172a',
          iconColor: '#f43f5e'
        });

        Toast.fire({
          icon: 'success',
          title: t('articles.delete_comment_success')
        });
      } catch (e) {}
    }
  };

  const handleToggleFavorite = async () => {
    if (!article?.id || togglingFavorite) return;
    try {
      setTogglingFavorite(true);
      const res = await articleService.toggleFavorite(article.id);
      setIsFavorited(res.isFavorited);
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true, background: '#ffffff', color: '#0f172a', iconColor: res.isFavorited ? '#f43f5e' : '#64748b' });
      Toast.fire({ icon: res.isFavorited ? 'success' : 'info', title: res.isFavorited ? t('articles.toast.favorite_added') : t('articles.toast.favorite_removed') });
    } catch (e) {} finally {
      setTogglingFavorite(false);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = article?.title || 'Check out this article';
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, timerProgressBar: true, background: '#ffffff', color: '#0f172a', iconColor: '#3b82f6' });
      Toast.fire({ icon: 'success', title: t('common.copied') });
      setIsShareModalOpen(false);
      return;
    }
    if (platform === 'native') {
      if (navigator.share) { navigator.share({ title, url }).catch(console.error); return; }
      setIsShareModalOpen(true); return;
    }
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`
    };
    if (shareUrls[platform]) { window.open(shareUrls[platform], '_blank', 'width=600,height=400'); setIsShareModalOpen(false); }
  };

  const insertFormatting = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end, value: text } = textarea;
    const selected = text.substring(start, end);
    let newText = '', offset = 0;
    if (type === 'inline') {
      newText = text.substring(0, start) + '`' + selected + '`' + text.substring(end);
      offset = 1;
    } else {
      const prefix = (start === 0 || text[start - 1] === '\n') ? '```\n' : '\n```\n';
      newText = text.substring(0, start) + prefix + (selected || '') + '\n```\n' + text.substring(end);
      offset = prefix.length;
    }
    setCommentText(newText);
    setTimeout(() => {
      textarea.focus();
      selected ? textarea.setSelectionRange(start + offset, start + offset + selected.length) : textarea.setSelectionRange(start + offset, start + offset);
    }, 10);
  };

  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart: start, selectionEnd: end, value: text } = textarea;
    setCommentText(text.substring(0, start) + emoji + text.substring(end));
    setIsEmojiPickerOpen(false);
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + emoji.length, start + emoji.length); }, 10);
  };

  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    const mainElement = document.querySelector('main');
    if (el && mainElement) {
      const offset = el.offsetTop - 100;
      mainElement.scrollTo({ top: offset, behavior: 'smooth' });
    } else if (el) {
      window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
    }
  };

  if (loading) return (
    <div className="w-full px-4 py-12 space-y-8 max-w-[1400px] mx-auto">
      <div className="bg-white p-12 rounded-[48px] border border-slate-200 animate-pulse h-96"></div>
    </div>
  );

  if (!article) return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <div className="bg-slate-50 p-8 rounded-[40px] mb-6 border border-slate-100"><BookOpen size={64} className="text-slate-200" /></div>
      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('articles.no_articles')}</h2>
      <button onClick={() => navigate('/knowledge-base')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase mt-8 text-xs">{t('articles.back_to_kb')}</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <div className="fixed top-0 left-0 w-full h-1.5 z-[110] bg-white/20 backdrop-blur-sm">
        <div className="h-full bg-blue-500 transition-all duration-150 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${readingProgress}%` }} />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
          
          <ArticleHeader 
            article={article} 
            commentsCount={comments.length}
            isFavorited={isFavorited}
            togglingFavorite={togglingFavorite}
            handleToggleFavorite={handleToggleFavorite}
            handleShare={handleShare}
            t={t}
            formatImageUrl={(url) => url}
          />

          <div className="relative">
            <main className="max-w-5xl mx-auto px-8 sm:px-12 md:px-16 py-16 sm:py-24">
              <article className="article-content prose prose-slate max-w-none prose-headings:font-black prose-p:text-slate-600 prose-p:leading-[1.8] prose-a:text-blue-600 prose-blockquote:border-blue-500 prose-pre:bg-slate-900 prose-pre:rounded-3xl">
                <div ref={contentRef} dangerouslySetInnerHTML={{ __html: article.content }} />
              </article>

              <div className="my-20 flex items-center gap-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                <BookOpen size={32} className="text-slate-200" />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </div>

              <CommentSection 
                user={user}
                comments={comments}
                commentText={commentText}
                setCommentText={setCommentText}
                submittingComment={submittingComment}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                isEmojiPickerOpen={isEmojiPickerOpen}
                setIsEmojiPickerOpen={setIsEmojiPickerOpen}
                handlePostComment={handlePostComment}
                handleDeleteComment={handleDeleteComment}
                insertFormatting={insertFormatting}
                insertEmoji={insertEmoji}
                textareaRef={textareaRef}
                emojiPickerRef={emojiPickerRef}
                emojis={emojis}
                t={t}
              />
            </main>
          </div>

          <RelatedArticles relatedArticles={relatedArticles} t={t} formatImageUrl={(url) => url} />

          <footer className="bg-slate-950 border-t border-white/5 p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="text-center sm:text-left space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('articles.last_updated')}</p>
              <div className="text-white font-bold text-sm flex items-center gap-2">
                <Clock size={14} className="text-blue-500" /> {format(new Date(article.updatedAt), 'dd MMMM yyyy')}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => navigate('/knowledge-base')} className="px-8 py-4 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 transition-all active:scale-95">{t('articles.back_to_kb')}</button>
              <button onClick={scrollToTop} className="px-8 py-4 bg-blue-600 text-white hover:bg-blue-500 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl shadow-blue-600/20 active:scale-95 flex items-center gap-3">{t('articles.back_to_top')} <ArrowUp size={16} /></button>
            </div>
          </footer>
        </div>
      </div>

      <ArticleToc isTocOpen={isTocOpen} setIsTocOpen={setIsTocOpen} toc={toc} activeId={activeId} scrollToSection={scrollToSection} readingProgress={readingProgress} commentsCount={comments.length} t={t} />
      <ShareModal isShareModalOpen={isShareModalOpen} setIsShareModalOpen={setIsShareModalOpen} handleShare={handleShare} t={t} />

      <button onClick={scrollToTop} className={`fixed bottom-10 right-10 size-14 sm:size-16 bg-slate-950 text-white rounded-[24px] flex items-center justify-center shadow-2xl transition-all duration-500 z-50 hover:bg-blue-600 hover:-translate-y-2 active:scale-90 shadow-blue-900/20 border border-white/10 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <ArrowUp size={24} />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .article-content { font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.8; color: #334155; font-size: 1.125rem; }
        .article-content h2 { margin-top: 4.5rem; margin-bottom: 2rem; font-weight: 900; font-size: 2.25rem; color: #0f172a; letter-spacing: -0.04em; border-left: 6px solid #3b82f6; padding-left: 1.5rem; scroll-margin-top: 120px; }
        .article-content h3 { margin-top: 3.5rem; margin-bottom: 1.5rem; font-weight: 800; font-size: 1.75rem; color: #1e293b; scroll-margin-top: 120px; }
        .article-content p { margin-bottom: 1.75rem; }
        .article-content img { max-width: 100%; height: auto; margin: 3rem auto; border-radius: 2.5rem; box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.12); border: 8px solid white; }
        .article-content blockquote { border-left: 6px solid #3b82f6; padding: 2rem 2.5rem; font-style: italic; color: #0f172a; margin: 3rem 0; background: #f8fafc; border-radius: 0 2.5rem 2.5rem 0; font-size: 1.25rem; line-height: 1.6; }
        .article-content pre { background: #0f172a; color: #f8fafc; padding: 2.5rem; border-radius: 2rem; overflow-x: auto; margin: 3rem 0; font-family: 'Fira Code', monospace; font-size: 0.9rem; position: relative; box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.25); line-height: 1.7; }
        .article-content code { background: #f1f5f9; color: #3b82f6; padding: 0.25rem 0.5rem; border-radius: 0.75rem; font-size: 0.85em; font-weight: 800; }
        .article-content pre code { background: transparent; color: inherit; padding: 0; font-weight: 400; font-size: inherit; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      ` }} />
    </div>
  );
};

export default ArticleDetail;
