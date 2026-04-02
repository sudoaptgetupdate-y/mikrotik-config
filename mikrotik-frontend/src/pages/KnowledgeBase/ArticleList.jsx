import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, Search, Filter, Calendar, User, Eye, Loader2, 
  Tag as TagIcon, Heart, LayoutGrid, Pin, Globe, ShieldAlert,
  ArrowRight, Sparkles, TrendingUp, Clock
} from 'lucide-react';
import articleService from '../../services/articleService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';

const ArticleList = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data States
  const [articles, setArticles] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [categories, setCategories] = useState([]);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'favorites'
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null && search !== searchTerm) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [category, activeTab, searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchArticles();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [category, activeTab, currentPage, searchTerm]);

  const fetchInitialData = async () => {
    try {
      const cats = await articleService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      setIsFetching(true);
      if (articles.length === 0) setLoading(true);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };
      
      if (category) params.categoryId = category;
      if (activeTab === 'favorites' && user?.id) {
        params.favoritedByUserId = user.id;
      }
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      const response = await articleService.getArticles(params);
      setArticles(response.articles || []);
      setTotalItems(response.total || 0);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const formatImageUrl = (url) => url;

  const handleTagClick = (e, tagName) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchTerm(tagName);
    setSearchParams({ search: tagName });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const getVisibilityBadge = (visibility) => {
    switch (visibility) {
      case 'EMPLOYEE':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black bg-blue-500/10 text-blue-600 border border-blue-200/50 backdrop-blur-sm">
            <User size={10} /> {t('articles.vis_employee')}
          </span>
        );
      case 'ADMIN':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black bg-rose-500/10 text-rose-600 border border-rose-200/50 backdrop-blur-sm">
            <ShieldAlert size={10} /> {t('articles.vis_admin')}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-200/50 backdrop-blur-sm">
            <Globe size={10} /> {t('articles.vis_public')}
          </span>
        );
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-700 pb-20">
      
      {/* 🚀 1. Search Hero Section (Modern Support Portal Style) */}
      <div className="relative mb-12 -mx-4 md:-mx-8 px-4 md:px-8 pt-12 pb-20 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-slate-950">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6 leading-[1.1]">
             {t('articles.kb_title')}
          </h1>
          
          <p className="text-slate-400 text-lg font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('articles.kb_subtitle')}
          </p>

          {/* Large Search Bar */}
          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute inset-0 bg-blue-600/20 blur-2xl group-focus-within:bg-blue-600/30 transition-all duration-500"></div>
            <div className="relative flex items-center bg-white rounded-[24px] p-2 shadow-2xl transition-all duration-300 group-focus-within:ring-4 group-focus-within:ring-blue-500/20">
              <div className="pl-4 pr-2 text-slate-400">
                <Search size={24} strokeWidth={2.5} />
              </div>
              <input 
                type="text" 
                placeholder={t('articles.search_placeholder')} 
                className="flex-1 bg-transparent border-none outline-none py-4 px-2 text-lg font-bold text-slate-800 placeholder:text-slate-400"
                value={searchTerm} 
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchParams(e.target.value ? { search: e.target.value } : {});
                }} 
              />
              <button className="bg-blue-600 text-white px-8 py-4 rounded-[18px] font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/30">
                {t('common.search')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category Chips & Tabs Section (Sticky) */}
      <div className="sticky top-0 z-30 -mt-10 mb-12 flex flex-col items-center">
        <div className="bg-white/80 backdrop-blur-xl p-2 rounded-[28px] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-wrap justify-center items-center gap-2 max-w-full overflow-x-auto no-scrollbar">
          <button 
            onClick={() => { setCategory(''); setActiveTab('all'); }}
            className={`px-6 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${
              !category && activeTab === 'all' 
              ? 'bg-slate-900 text-white shadow-lg' 
              : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t('articles.all_categories')}
          </button>

          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => { setCategory(cat.id); setActiveTab('all'); }}
              className={`px-6 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${
                category === cat.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}

          <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>

          <button 
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-6 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'favorites' 
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' 
              : 'text-slate-500 hover:text-rose-500 hover:bg-rose-50'
            }`}
          >
            <Heart size={16} fill={activeTab === 'favorites' ? "currentColor" : "none"} />
            {t('articles.tab_favorites')}
          </button>
        </div>
      </div>

      {/* 3. Article Grid Area */}
      <div className="max-w-7xl mx-auto px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 text-slate-400">
            <Loader2 size={48} className="animate-spin text-blue-600 mb-6" />
            <p className="font-black uppercase tracking-widest text-xs animate-pulse">{t('common.loading')}</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-[48px] border border-slate-200 p-20 text-center shadow-sm">
             <div className="inline-flex p-10 bg-slate-50 rounded-full text-slate-200 mb-8">
               <BookOpen size={80} strokeWidth={1} />
             </div>
             <h3 className="text-3xl font-black text-slate-800 mb-4">{t('articles.no_articles')}</h3>
             <p className="text-slate-500 font-medium max-w-md mx-auto mb-10 text-lg">
                ไม่พบบทความที่คุณกำลังมองหา ลองเปลี่ยนคำค้นหาหรือหมวดหมู่ดูนะครับ
             </p>
             <button 
                onClick={() => { setSearchTerm(''); setCategory(''); setActiveTab('all'); setSearchParams({}); }}
                className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all active:scale-95"
             >
                กลับไปดูทั้งหมด
             </button>
          </div>
        ) : (
          <div className={`transition-all duration-500 ${isFetching ? 'opacity-40 blur-[2px]' : 'opacity-100'}`}>
            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {articles.map((article) => (
                <Link 
                  key={article.id} 
                  to={`/knowledge-base/${article.slug}`}
                  className="group relative bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-3 flex flex-col h-full"
                >
                  {/* Image/Thumbnail Wrapper */}
                  <div className="relative aspect-[16/10] overflow-hidden">
                    {article.thumbnail ? (
                      <img 
                        src={formatImageUrl(article.thumbnail)} 
                        alt={article.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                        <BookOpen size={64} className="text-slate-200" strokeWidth={1.5} />
                      </div>
                    )}
                    
                    {/* Floating Badges */}
                    <div className="absolute top-5 left-5 flex flex-wrap gap-2">
                       {article.isPinned && (
                         <div className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-blue-500/30">
                           <Pin size={10} fill="currentColor" />
                           {t('articles.pin_article')}
                         </div>
                       )}
                       {getVisibilityBadge(article.visibility)}
                    </div>

                    {/* Category Overlay (Bottom Right) */}
                    <div className="absolute bottom-5 right-5">
                       <div className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-slate-800 border border-white/50 shadow-sm uppercase tracking-widest">
                         {article.category?.name || t('articles.uncategorized')}
                       </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">
                       <TrendingUp size={12} className="text-blue-500" />
                       <span>{article.viewCount} {t('common.views')}</span>
                       <span className="text-slate-200">•</span>
                       <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>5 MIN READ</span>
                       </div>
                    </div>

                    <h2 className="text-2xl font-black text-slate-800 leading-tight mb-4 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {article.title}
                    </h2>

                    <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-3 mb-8 flex-1">
                      {article.excerpt || "ไม่มีข้อมูลสรุปสำหรับบทความนี้..."}
                    </p>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs border-2 border-white shadow-sm ring-1 ring-slate-100 uppercase">
                            {article.author?.firstName?.charAt(0)}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{article.author?.firstName} {article.author?.lastName}</span>
                            <span className="text-[10px] font-bold text-slate-400">{format(new Date(article.createdAt), 'dd MMM yyyy')}</span>
                         </div>
                      </div>
                      
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner">
                         <ArrowRight size={18} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom Pagination */}
            <div className="mt-20">
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px bg-slate-200 flex-1"></div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-4">
                   {t('common.found')}: <span className="text-slate-900">{totalItems} {t('common.items')}</span>
                </div>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                setCurrentPage={setCurrentPage} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleList;
