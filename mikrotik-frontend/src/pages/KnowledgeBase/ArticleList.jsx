import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Search, Filter, Calendar, User, Eye, Loader2, Tag as TagIcon, Heart, LayoutGrid, Pin } from 'lucide-react';
import articleService from '../../services/articleService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { getToken } from '../../utils/apiClient';
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
  const itemsPerPage = 6; // Show 6 articles per page

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Sync searchTerm state with URL param
  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null && search !== searchTerm) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  useEffect(() => {
    // Reset to first page when tab or category or search changes
    setCurrentPage(1);
  }, [category, activeTab, searchTerm]);

  useEffect(() => {
    // Debounce the search if needed, but for simplicity here we use the dependency array
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
      
      // Use server-side search
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

  const formatImageUrl = (url) => {
    if (!url) return null;
    return url;
  };

  const handleTagClick = (e, tagName) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchTerm(tagName);
    setSearchParams({ search: tagName });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // 🟢 เปลี่ยนมาใช้โครงสร้างที่สมดุลกับ Dashboard (ลบ Margin และ Padding ที่ซ้ำซ้อนออก)
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 1. Page Header Section (Island Card) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
              <BookOpen size={24} />
            </div>
            {t('articles.kb_title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium italic ml-1">
            {t('articles.kb_subtitle')}
          </p>
        </div>
        
        <div className="absolute right-0 top-0 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-700"></div>
      </div>

      {/* 2. Control Toolbar (Tabs, Search, Filter) */}
      <div className="space-y-4">
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-max">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${
              activeTab === 'all' 
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={16} />
            {t('articles.tab_all')}
          </button>
          <button 
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-black transition-all ${
              activeTab === 'favorites' 
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' 
              : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50/50'
            }`}
          >
            <Heart size={16} fill={activeTab === 'favorites' ? "currentColor" : "none"} />
            {t('articles.tab_favorites')}
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('articles.search_placeholder')} 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium" 
              value={searchTerm} 
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value === '') {
                  setSearchParams({});
                } else {
                  setSearchParams({ search: e.target.value });
                }
              }} 
            />
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl w-full sm:w-auto">
            <Filter size={16} className="text-slate-400" />
            <select 
              className="bg-transparent outline-none text-slate-700 font-bold text-sm min-w-[140px] cursor-pointer"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t('articles.all_categories')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 font-bold uppercase tracking-widest">
            <Loader2 size={36} className="animate-spin text-blue-600 mb-4" />
            <p className="text-xs">{t('common.loading')}</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 min-h-[450px] md:min-h-[600px] animate-in fade-in duration-500">
            <div className={`p-8 rounded-[40px] mb-6 border border-slate-100 shadow-inner ${activeTab === 'favorites' ? 'bg-rose-50 text-rose-200' : 'bg-slate-50 text-slate-200'}`}>
              {activeTab === 'favorites' ? <Heart size={64} /> : <BookOpen size={64} />}
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {activeTab === 'favorites' ? t('common.no_data') : t('articles.no_articles')}
            </h3>
            <p className="text-slate-400 mt-2 font-medium max-w-xs mx-auto leading-relaxed">
              {activeTab === 'favorites' 
                ? "You haven't favorited any articles yet. Start exploring and save the ones you like!" 
                : t('articles.no_articles_desc')}
            </p>
            {(activeTab === 'favorites' || searchTerm !== '' || category !== '') && (
              <button 
                onClick={() => {
                  setActiveTab('all');
                  setSearchTerm('');
                  setCategory('');
                  setSearchParams({});
                }}
                className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 transition-all active:scale-95"
              >
                {t('articles.tab_all')}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={`p-6 md:p-10 min-h-[450px] md:min-h-[600px] transition-opacity duration-300 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {articles.map((article) => (
                  <Link 
                    key={article.id} 
                    to={`/knowledge-base/${article.slug}`}
                    className={`group flex flex-col h-full bg-white border rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 hover:-translate-y-2 border-b-4 shadow-sm ${
                      article.isPinned 
                      ? 'border-blue-500/50 border-b-blue-600 ring-4 ring-blue-500/5' 
                      : 'border-slate-100 border-b-slate-100 hover:border-b-blue-500'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[16/10] bg-slate-50 relative overflow-hidden shrink-0">
                      {article.thumbnail ? (
                        <img 
                          src={formatImageUrl(article.thumbnail)} 
                          alt={article.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
                          <BookOpen size={56} className="text-blue-100" />
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4 flex gap-2">
                        {article.isPinned && (
                          <span className="backdrop-blur-md bg-blue-600/90 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg flex items-center gap-1.5 border border-blue-400/30 animate-pulse">
                            <Pin size={12} fill="currentColor" />
                            {t('articles.pin_article')}
                          </span>
                        )}
                        <span className="backdrop-blur-md bg-white/90 text-blue-600 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm border border-white/20">
                          {article.category?.name || t('articles.uncategorized')}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-black text-slate-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                        {article.title}
                      </h3>
                      
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {article.tags.map(tag => (
                            <button 
                              key={tag.id} 
                              onClick={(e) => handleTagClick(e, tag.name)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all z-10"
                            >
                              <TagIcon size={10} />
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="text-slate-500 text-sm line-clamp-3 mb-6 leading-relaxed font-medium flex-1">
                        {article.excerpt || t('devices.table.noData')}
                      </p>
                      
                      <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[10px] border border-white shadow-sm uppercase">
                            {article.author?.firstName?.charAt(0)}
                          </div>
                          <span className="text-xs font-black text-slate-600">@{article.author?.username}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-tighter">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-300" />
                            {format(new Date(article.createdAt), 'dd MMM yy')}
                          </div>
                          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                            <Eye size={12} className="text-slate-300" />
                            {article.viewCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center mt-10 mb-4 px-10">
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t('common.found')}: <span className="text-slate-700">{totalItems} {t('common.items')}</span>
               </div>
            </div>

            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              setCurrentPage={setCurrentPage} 
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ArticleList;
