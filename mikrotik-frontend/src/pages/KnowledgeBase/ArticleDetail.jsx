import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowUp, Clock, Download, FileText } from 'lucide-react';
import articleService from '../../services/articleService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import 'quill/dist/quill.snow.css';

// Sub-components
import ArticleHeader from './components/ArticleDetail/ArticleHeader';
import CommentSection from './components/ArticleDetail/CommentSection';
import RelatedArticles from './components/ArticleDetail/RelatedArticles';
import ArticleToc from './components/ArticleDetail/ArticleToc';
import ShareModal from './components/ArticleDetail/ShareModal';
import VideoPlayer from './components/ArticleDetail/VideoPlayer';

// Memoized Content Component
const ArticleContentRenderer = React.memo(({ content, loading }) => {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!content || loading) return;

    const timer = setTimeout(() => {
      // Find all code blocks inside any element with class .article-content
      const codeBlocks = document.querySelectorAll('.article-content pre, .article-content .ql-syntax, .article-content .ql-code-block-container');
      
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
          expandBtn.className = 'bg-white/10 hover:bg-white/20 text-white text-[10px] font-black px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-md transition-all shadow-xl uppercase tracking-[0.2em] flex items-center group-active:scale-95';
          
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
              expandBtn.className = 'bg-white/10 hover:bg-white/20 text-white text-[10px] font-black px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-md transition-all shadow-xl uppercase tracking-[0.2em] flex items-center group-active:scale-95';
              block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          };
          
          expandWrapper.appendChild(expandBtn);
          block.appendChild(expandWrapper);
        }
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [content, loading]);

  const renderContentWithVideos = (html) => {
    if (!html) return null;

    // Regex for [video:URL] or [video:URL|TITLE]
    // Improved regex to handle various URL characters and avoid greedy matching
    const videoRegex = /\[video:([^|\]\n]+)(?:\|([^\]\n]+))?\]/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = videoRegex.exec(html)) !== null) {
      // Add text before the video
      if (match.index > lastIndex) {
        parts.push(
          <div 
            key={`text-${lastIndex}`} 
            className="ql-editor" 
            style={{ padding: 0, minHeight: 'auto' }} 
            dangerouslySetInnerHTML={{ __html: html.substring(lastIndex, match.index) }} 
          />
        );
      }

      const videoUrl = match[1].trim();
      const videoTitle = match[2] ? match[2].trim() : '';

      // Add the video player
      parts.push(
        <div key={`video-${match.index}`} className="my-8 first:mt-0 last:mb-0">
          <VideoPlayer 
            videoUrl={videoUrl} 
            title={videoTitle} 
          />
        </div>
      );

      lastIndex = videoRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < html.length) {
      parts.push(
        <div 
          key={`text-${lastIndex}`} 
          className="ql-editor" 
          style={{ padding: 0, minHeight: 'auto' }} 
          dangerouslySetInnerHTML={{ __html: html.substring(lastIndex) }} 
        />
      );
    }

    return parts;
  };

  return (
    <div className="ql-container ql-snow" style={{ border: 'none' }}>
      <div 
        ref={contentRef} 
        className="article-content article-render-container" 
        style={{ padding: 0, minHeight: 'auto' }}
      >
        {renderContentWithVideos(content)}
      </div>
    </div>
  );
});

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [toc, setToc] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [isTocOpen, setIsTocOpen] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  const contentRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const hasFetchedRef = useRef(false);

  const emojis = ['😀', '😂', '😍', '😮', '😢', '😡', '👍', '👎', '🙌', '👏', '🔥', '✨', '💡', '✅', '❌', '🚀', '💻', '⚙️', '📡', '🔒'];

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (hasFetchedRef.current !== slug) {
      fetchArticle();
      hasFetchedRef.current = slug;
    }
  }, [slug]);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    
    const handleScroll = () => {
      if (!mainElement) return;

      // 1. ดึงค่าตำแหน่งการสกรอลจาก main element โดยตรง
      const scrollTop = mainElement.scrollTop;
      
      // 2. คำนวณความสูงทั้งหมดที่สกรอลได้ของตัว main เอง
      const scrollHeight = mainElement.scrollHeight;
      const clientHeight = mainElement.clientHeight;
      const height = scrollHeight - clientHeight;
      
      // 3. ปรับปรุงการแสดงผล Scroll Top Button และ Progress
      setShowScrollTop(scrollTop > 400);

      if (height > 0) {
        const scrolled = (scrollTop / height) * 100;
        setReadingProgress(Math.min(scrolled, 100));
      }

      // 4. Update Active ToC Section
      if (article) {
        const headings = document.querySelectorAll('.article-content h2, .article-content h3');
        let currentActive = '';
        headings.forEach((heading) => {
          const rect = heading.getBoundingClientRect();
          // สำหรับ ToC เราใช้ตำแหน่งสัมพัทธ์กับหน้าจอ (viewport) 
          // ซึ่ง getBoundingClientRect() ให้ค่านี้อยู่แล้ว
          if (rect.top >= 0 && rect.top <= 250) {
            currentActive = heading.id;
          }
        });
        if (currentActive) setActiveId(currentActive);
      }
    };

    // ใช้ Passive Listener บน mainElement เพราะเป็นตัวที่ overflow-y-auto
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
      // เรียกครั้งแรกเพื่อตั้งค่าเริ่มต้น
      handleScroll();
    }

    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
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
        Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success', title: t('articles.delete_comment_success') });
      } catch (e) {}
    }
  };

  const handleToggleFavorite = async () => {
    if (!article?.id || togglingFavorite) return;
    try {
      setTogglingFavorite(true);
      const res = await articleService.toggleFavorite(article.id);
      setIsFavorited(res.isFavorited);
      Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: res.isFavorited ? 'success' : 'info', title: res.isFavorited ? t('articles.toast.favorite_added') : t('articles.toast.favorite_removed') });
    } catch (e) {} finally {
      setTogglingFavorite(false);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = article?.title || 'Check out this article';
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, icon: 'success', title: t('common.copied') });
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-50 min-h-screen p-10">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 animate-pulse h-[600px] shadow-sm"></div>
    </div>
  );

  if (!article) return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-slate-50 min-h-screen">
      <div className="bg-white p-8 rounded-3xl mb-6 border border-slate-100"><BookOpen size={64} className="text-slate-200" /></div>
      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('articles.no_articles')}</h2>
      <button onClick={() => navigate('/knowledge-base')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase mt-8 text-xs">{t('articles.back_to_kb')}</button>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 bg-slate-50 min-h-screen">
      {/* 1. Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 z-[110] bg-white/10 backdrop-blur-md pointer-events-none">
        <div className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 bg-[length:200%_auto] animate-marquee transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.4)]" style={{ width: `${readingProgress}%` }} />
      </div>

      {/* 2. Unified Light-Cream Header Stage */}
      <div className="relative overflow-hidden pt-8 pb-20 bg-slate-50">
        {/* Subtle Glow Effects - Very Light */}
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-blue-400/[0.03] blur-[180px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-300/[0.03] blur-[150px] rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-[48px] overflow-hidden border border-slate-100 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.05)] bg-white relative">
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
            </div>
          </div>
        </div>
      </div>

      {/* 3. Floating Elevated Content Section - Tighter Overlap */}
      <div className="relative -mt-16 z-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Main Card - Crisp White Floating on Slate-50 */}
          <div className="bg-white rounded-[60px] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.06),0_10px_40px_-20px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
            <main className="px-6 sm:px-12 md:px-20 lg:px-24 pt-12 sm:pt-16 pb-20">
              <div className="article-detail-content max-w-none">
                <ArticleContentRenderer content={article.content} loading={loading} />
              </div>

              {/* --- 📎 Attachments Section --- */}
              {article.attachments && article.attachments.length > 0 && (
                <div className="mt-16 pt-10 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                      <Download size={20} />
                    </div>
                    {t('articles.download_files', 'Download Documents')}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {article.attachments.map((file) => (
                      <a 
                        key={file.id} 
                        href={articleService.getDownloadUrl(file.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-blue-200 p-5 rounded-[32px] flex items-center gap-4 transition-all hover:shadow-2xl hover:shadow-blue-900/5 active:scale-[0.98]"
                      >
                        <div className="size-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-100 shadow-sm transition-all group-hover:scale-110">
                          <FileText size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-700 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight mb-1">{file.filename}</p>
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                            <span className="bg-slate-200/50 px-2 py-0.5 rounded-md uppercase text-slate-500">{file.fileExt}</span>
                            <span className="text-slate-200">•</span>
                            <span>{formatFileSize(file.fileSize)}</span>
                          </div>
                        </div>
                        <div className="size-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                          <Download size={18} />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="my-28 flex items-center gap-12">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-600/5 blur-xl rounded-full" />
                  <div className="relative size-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
                    <BookOpen size={28} strokeWidth={1.5} />
                  </div>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </div>

              {/* Comment Section */}
              <div className="max-w-4xl mx-auto">
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
              </div>
            </main>

            <RelatedArticles relatedArticles={relatedArticles} t={t} formatImageUrl={(url) => url} />

            <footer className="bg-slate-50/50 backdrop-blur-md border-t border-slate-100 p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="text-center sm:text-left space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('articles.last_updated')}</p>
                <div className="text-slate-800 font-black text-base flex items-center gap-3 justify-center sm:justify-start">
                  <div className="size-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm text-blue-600">
                    <Clock size={16} />
                  </div>
                  {format(new Date(article.updatedAt), 'dd MMMM yyyy')}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => navigate('/knowledge-base')} className="px-8 py-4 bg-white text-slate-700 hover:bg-slate-50 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-200 transition-all active:scale-95 shadow-sm">{t('articles.back_to_kb')}</button>
                <button onClick={scrollToTop} className="px-8 py-4 bg-slate-900 text-white hover:bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center gap-3">{t('articles.back_to_top')} <ArrowUp size={16} /></button>
              </div>
            </footer>
          </div>
        </div>
      </div>

      <ArticleToc isTocOpen={isTocOpen} setIsTocOpen={setIsTocOpen} toc={toc} activeId={activeId} scrollToSection={scrollToSection} readingProgress={readingProgress} commentsCount={comments.length} t={t} />
      <ShareModal isShareModalOpen={isShareModalOpen} setIsShareModalOpen={setIsShareModalOpen} handleShare={handleShare} t={t} />

      <button onClick={scrollToTop} className={`fixed bottom-10 right-10 size-14 sm:size-16 bg-slate-950 text-white rounded-[24px] flex items-center justify-center shadow-2xl transition-all duration-500 z-50 hover:bg-blue-600 hover:-translate-y-2 active:scale-95 border border-white/10 group ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <ArrowUp size={24} className="group-hover:animate-bounce" />
      </button>
    </div>
  );
};

export default ArticleDetail;
