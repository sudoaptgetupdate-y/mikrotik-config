import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Calendar, User, Eye, Copy, Check, 
  Clock, Folder, Tag as TagIcon, ArrowUp, Share2, 
  Bookmark, Heart, BookOpen, Loader2, Link as LinkIcon,
  ChevronRight, FileText, Facebook, Twitter, Linkedin, X as XIcon,
  MessageCircle, Send, Reply, Trash2, Hash, List
} from 'lucide-react';
import articleService from '../../services/articleService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { getToken } from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [toc, setToc] = useState([]);
  const [activeId, setActiveId] = useState('');
  
  // Comment State
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const contentRef = useRef(null);

  useEffect(() => {
    fetchArticle();
    
    const mainElement = document.querySelector('main');
    
    const handleScroll = () => {
      const element = mainElement || window;
      const scrollTop = mainElement ? mainElement.scrollTop : window.scrollY;
      const scrollHeight = mainElement ? mainElement.scrollHeight : document.documentElement.scrollHeight;
      const clientHeight = mainElement ? mainElement.clientHeight : window.innerHeight;

      setShowScrollTop(scrollTop > 400);

      // Reading Progress
      const totalScroll = scrollHeight - clientHeight;
      if (totalScroll > 0) {
        setReadingProgress((scrollTop / totalScroll) * 100);
      }

      // Active Heading Detection
      if (article) {
        const headings = document.querySelectorAll('.article-content h2, .article-content h3');
        let currentActive = '';
        headings.forEach((heading) => {
          const top = heading.getBoundingClientRect().top;
          if (top < 150) {
            currentActive = heading.id;
          }
        });
        setActiveId(currentActive);
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
  }, [slug, article?.id]);

  const formatImageUrl = (url) => {
    if (!url) return null;
    return url;
  };

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const data = await articleService.getArticle(slug);
      
      // Process HTML content to add IDs to headings for ToC
      const processedContent = processHeadings(data.content);
      const tocData = generateToC(data.content);
      
      setArticle({ ...data, content: processedContent });
      setToc(tocData);
      
      if (data?.id) {
        fetchFavoriteStatus(data.id);
        fetchComments(data.id);
      }
      
      const response = await articleService.getArticles({ limit: 50 });
      const allArticles = response.articles || [];
      const otherArticles = allArticles.filter(a => a.id !== data.id && a.status === 'PUBLISHED');
      const sameCategory = otherArticles.filter(a => a.categoryId === data.categoryId);
      const combined = [...sameCategory, ...otherArticles.filter(a => a.categoryId !== data.categoryId)]
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .slice(0, 3);
        
      setRelatedArticles(combined);

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

  const processHeadings = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const headings = div.querySelectorAll('h2, h3');
    headings.forEach((heading, index) => {
      const id = heading.innerText.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || `section-${index}`;
      heading.id = id;
    });
    return div.innerHTML;
  };

  const generateToC = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const headings = div.querySelectorAll('h2, h3');
    return Array.from(headings).map((heading, index) => ({
      id: heading.innerText.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || `section-${index}`,
      text: heading.innerText,
      level: heading.tagName.toLowerCase()
    }));
  };

  const fetchFavoriteStatus = async (articleId) => {
    try {
      const result = await articleService.getFavoriteStatus(articleId);
      setIsFavorited(result.isFavorited);
    } catch (error) {
      console.error('Failed to fetch favorite status:', error);
    }
  };

  const fetchComments = async (articleId) => {
    try {
      const data = await articleService.getComments(articleId);
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const newComment = await articleService.createComment(article.id, {
        content: commentText,
        parentId: replyTo?.id || null
      });

      // Update local state
      if (replyTo) {
        setComments(prev => prev.map(c => {
          if (c.id === replyTo.id) {
            return { ...c, replies: [...(c.replies || []), newComment] };
          }
          return c;
        }));
      } else {
        setComments(prev => [newComment, ...prev]);
      }

      setCommentText('');
      setReplyTo(null);
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: t('articles.comment_posted'),
        showConfirmButton: false,
        timer: 2000
      });
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId, isReply = false, parentId = null) => {
    const result = await Swal.fire({
      title: t('articles.delete_comment_title'),
      text: t('articles.delete_comment_text'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0f172a',
      cancelButtonColor: '#f1f5f9',
      confirmButtonText: t('articles.delete_comment_confirm'),
      cancelButtonText: t('common.cancel')
    });

    if (result.isConfirmed) {
      try {
        await articleService.deleteComment(commentId);
        
        if (isReply && parentId) {
          setComments(prev => prev.map(c => {
            if (c.id === parentId) {
              return { ...c, replies: c.replies.filter(r => r.id !== commentId) };
            }
            return c;
          }));
        } else {
          setComments(prev => prev.filter(c => c.id !== commentId));
        }

        Swal.fire(
          t('common.delete'),
          t('articles.delete_comment_success'),
          'success'
        );
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
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
        title: result.isFavorited ? t('common.save') : t('common.delete')
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
          navigator.share({ title, url }).catch(console.error);
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

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    const mainElement = document.querySelector('main');
    if (element) {
      if (mainElement) {
        const offset = element.offsetTop - 50;
        mainElement.scrollTo({ top: offset, behavior: 'smooth' });
      } else {
        const offset = element.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
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
      
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[110] bg-slate-100">
        <div className="h-full bg-blue-600 transition-all duration-150" style={{ width: `${readingProgress}%` }} />
      </div>

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

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl shadow-slate-900/5 overflow-hidden">
        
        {/* 2. Header Section */}
        <header className="relative h-[250px] sm:h-[300px] group flex flex-col justify-end">
          {article.thumbnail ? (
            <img 
              src={formatImageUrl(article.thumbnail)} 
              alt={article.title} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            />
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

        {/* 3. Meta Bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-8 sm:px-10 py-5 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-8">
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

            <div className="hidden sm:flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-400 border-l border-slate-200 pl-8">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-blue-500" />
                {format(new Date(article.createdAt), 'dd MMM yyyy')}
              </div>
              <div className="flex items-center gap-2">
                <Eye size={13} className="text-blue-500" />
                {article.viewCount} {t('common.items')}
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle size={13} className="text-blue-500" />
                {comments.length} {t('common.comments')}
              </div>
            </div>
          </div>

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

        {/* 4. Main Section with Sidebar Layout */}
        <div className="flex flex-col lg:flex-row relative">
          {/* Main Content Area */}
          <main className="flex-1 p-8 sm:p-10 md:p-12 lg:pr-6 border-r border-slate-100">
            <article className="article-content prose prose-slate max-w-none">
              <div ref={contentRef} dangerouslySetInnerHTML={{ __html: article.content }} />
            </article>

            <hr className="my-12 border-slate-100" />

            {/* Comment Section Integration */}
            <section id="comments-section" className="space-y-10 scroll-mt-20">
               <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                   <MessageCircle size={24} className="text-blue-600" />
                   {t('common.comments')} ({comments.length})
                 </h3>
               </div>

               {/* Comment Form */}
               <div className="bg-slate-50 rounded-[32px] p-6 sm:p-8 border border-slate-100">
                 {replyTo && (
                   <div className="mb-4 flex items-center justify-between bg-blue-50 px-4 py-2 rounded-xl text-blue-700 text-xs font-bold">
                     <div className="flex items-center gap-2">
                       <Reply size={14} />
                       {t('articles.replying_to', { name: replyTo.user.username })}
                     </div>
                     <button onClick={() => setReplyTo(null)} className="text-blue-400 hover:text-blue-600 font-black">{t('common.cancel').toUpperCase()}</button>
                   </div>
                 )}
                 <form onSubmit={handlePostComment} className="relative">
                   <textarea
                     value={commentText}
                     onChange={(e) => setCommentText(e.target.value)}
                     placeholder={user ? t('articles.write_comment') : t('articles.login_to_comment')}
                     disabled={!user || submittingComment}
                     className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all min-h-[120px] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                   />
                   <div className="mt-4 flex justify-end">
                     <button
                        type="submit"
                        disabled={!user || !commentText.trim() || submittingComment}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                     >
                       {submittingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                       {t('common.send')}
                     </button>
                   </div>
                 </form>
               </div>

               {/* Comments List */}
               <div className="space-y-8 mt-12">
                 {comments.length > 0 ? (
                    comments.map(comment => (
                      <div key={comment.id} className="group animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex gap-4">
                           <div className="size-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 font-black text-xs border border-slate-200 uppercase shrink-0">
                             {comment.user.firstName?.charAt(0) || comment.user.username?.charAt(0)}
                           </div>
                           <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-900 text-sm">{comment.user.username}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">• {format(new Date(comment.createdAt), 'dd MMM yyyy')}</span>
                                 </div>
                                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {user && (
                                      <button 
                                        onClick={() => {
                                          setReplyTo(comment);
                                          document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-1"
                                      >
                                        <Reply size={12} /> {t('articles.reply')}
                                      </button>
                                    )}
                                    {(user?.id === comment.userId || user?.role === 'SUPER_ADMIN') && (
                                      <button onClick={() => handleDeleteComment(comment.id)} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 flex items-center gap-1">
                                        <Trash2 size={12} /> {t('common.delete')}
                                      </button>
                                    )}
                                 </div>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100/50">{comment.content}</p>
                              
                              {/* Replies */}
                              {comment.replies?.length > 0 && (
                                <div className="mt-4 ml-6 pl-6 border-l-2 border-slate-100 space-y-6">
                                   {comment.replies.map(reply => (
                                     <div key={reply.id} className="group/reply space-y-2">
                                        <div className="flex items-center justify-between">
                                           <div className="flex items-center gap-2">
                                              <div className="size-7 bg-white rounded-lg flex items-center justify-center text-slate-900 font-black text-[9px] border border-slate-200 uppercase">
                                                {reply.user.username.charAt(0)}
                                              </div>
                                              <span className="font-black text-slate-900 text-xs">{reply.user.username}</span>
                                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">• {format(new Date(reply.createdAt), 'dd MMM yyyy')}</span>
                                           </div>
                                           {(user?.id === reply.userId || user?.role === 'SUPER_ADMIN') && (
                                              <button onClick={() => handleDeleteComment(reply.id, true, comment.id)} className="opacity-0 group-hover/reply:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600">
                                                <Trash2 size={12} />
                                              </button>
                                           )}
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">{reply.content}</p>
                                     </div>
                                   ))}
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    ))
                 ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-[32px] border border-slate-100">
                       <MessageCircle size={40} className="mx-auto text-slate-200 mb-4" />
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{t('articles.no_comments_yet')}</p>
                    </div>
                 )}
               </div>
            </section>
          </main>

          {/* Sticky Sidebar */}
          <aside className="hidden lg:block w-80 shrink-0 p-8 sm:p-10">
            <div className="sticky top-8 space-y-8">
              
              {/* Table of Contents */}
              {toc.length > 0 && (
                <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <List size={14} className="text-blue-600" />
                    {t('articles.toc')}
                  </h4>
                  <nav className="space-y-1">
                    {toc.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full text-left text-xs py-2 px-3 rounded-xl transition-all flex gap-3 group ${activeId === item.id ? 'bg-white text-blue-600 shadow-sm font-bold border-l-4 border-blue-600' : 'text-slate-400 hover:text-slate-900 hover:bg-white/50'}`}
                      >
                        <span className={`shrink-0 transition-colors ${activeId === item.id ? 'text-blue-400' : 'text-slate-200 group-hover:text-slate-300'}`}>
                          {item.level === 'h2' ? <Hash size={12} /> : <span className="ml-2">•</span>}
                        </span>
                        <span className="line-clamp-2">{item.text}</span>
                      </button>
                    ))}
                    {/* Add Discussion to ToC */}
                    <button
                      onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className={`w-full text-left text-xs py-2 px-3 rounded-xl transition-all flex gap-3 group mt-4 border-t border-slate-100 pt-4 ${activeId === 'comments-section' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                      <span className="shrink-0 text-slate-200 group-hover:text-blue-400">
                        <MessageCircle size={12} />
                      </span>
                      <span>{t('common.comments')} ({comments.length})</span>
                    </button>
                  </nav>
                </div>
              )}

              {/* Reading Progress Indicator */}
              <div className="bg-slate-900 rounded-[32px] p-6 text-white overflow-hidden relative shadow-xl shadow-slate-200">
                 <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-300" style={{ width: `${readingProgress}%` }} />
                 <div className="flex justify-between items-end">
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('articles.reading_progress')}</p>
                       <p className="text-2xl font-black mt-1">{Math.round(readingProgress)}%</p>
                    </div>
                    <button 
                      onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                      className="size-10 bg-white/10 hover:bg-blue-600 rounded-xl flex items-center justify-center transition-all group"
                      title={t('common.comments')}
                    >
                      <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                 </div>
              </div>
            </div>
          </aside>
        </div>

        {/* 5. Explore More */}
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

        {/* 6. Footer Navigation */}
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
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">{t('common.share')}</h3>
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
                <span className="text-[10px] font-black uppercase tracking-widest">{t('common.copied').replace('!', '')}</span>
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
        .article-content h2 { 
          margin-top: 3.5rem; 
          margin-bottom: 1.5rem; 
          font-weight: 900; 
          font-size: 1.85rem; 
          color: #0f172a; 
          letter-spacing: -0.04em; 
          border-left: 4px solid #3b82f6; 
          padding-left: 1rem;
          scroll-margin-top: 100px;
        }
        .article-content h3 { 
          margin-top: 2.5rem; 
          margin-bottom: 1rem; 
          font-weight: 800; 
          font-size: 1.5rem; 
          color: #1e293b;
          scroll-margin-top: 100px;
        }
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
