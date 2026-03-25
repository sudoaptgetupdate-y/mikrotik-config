import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Edit, Trash2, Eye, EyeOff, Search, 
  FileText, Calendar, User, BookOpen,
  FolderTree, RefreshCw, Loader2, MoreVertical
} from 'lucide-react';
import articleService from '../../../services/articleService';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import ArticleFormModal from './components/ArticleFormModal';
import ArticleTaxonomyModal from './components/ArticleTaxonomyModal';
import ArticlePreviewModal from './components/ArticlePreviewModal';
import Pagination from '../../../components/Pagination';

const PAGE_SIZES = [5, 10, 20, 50];

const ArticleManager = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZES[0]); // Default to 5

  // Modal States
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [isTaxonomyModalOpen, setIsTaxonomyModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [previewArticleId, setPreviewArticleId] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, [currentPage, itemsPerPage]);

  const fetchArticles = async () => {
    try {
      setIsFetching(true);
      if (articles.length === 0) setLoading(true);
      
      const params = {
        page: currentPage,
        limit: itemsPerPage
      };
      
      const response = await articleService.getArticles(params);
      
      if (response && response.articles) {
        setArticles(response.articles);
        setTotalItems(response.total);
      } else if (Array.isArray(response)) {
        setArticles(response);
        setTotalItems(response.length);
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedArticleId(null);
    setIsArticleModalOpen(true);
  };

  const handleEdit = (id) => {
    setSelectedArticleId(id);
    setIsArticleModalOpen(true);
  };

  const handleDelete = async (id, title) => {
    const result = await Swal.fire({
      title: t('common.yesDelete'),
      text: `${t('articles.delete_article_confirm')}: ${title}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common.yesDelete'),
      cancelButtonText: t('common.cancel'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-[32px] p-8 border border-slate-100 shadow-2xl',
        title: 'text-2xl font-black text-slate-800 tracking-tight',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-3',
        actions: 'flex gap-3 mt-8 w-full justify-center',
        confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-rose-200 transition-all active:scale-95',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-500 px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95'
      }
    });

    if (result.isConfirmed) {
      try {
        await articleService.deleteArticle(id);
        toast.success(t('articles.toast.deleted'));
        fetchArticles();
      } catch (error) {
        Swal.fire({
          title: t('common.error'),
          text: t('common.error_default'),
          icon: 'error',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-[32px] p-8 border border-slate-100 shadow-2xl',
            title: 'text-2xl font-black text-slate-800 tracking-tight',
            htmlContainer: 'text-sm text-slate-500 font-medium mt-3',
            confirmButton: 'bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-95'
          }
        });
      }
    }
  };

  const toggleStatus = async (article) => {
    const newStatus = article.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    const updatePromise = articleService.updateArticle(article.id, { status: newStatus });
    
    toast.promise(updatePromise, {
      loading: t('common.saving'),
      success: t('articles.toast.updated'),
      error: t('common.error_default')
    });

    try {
      await updatePromise;
      setArticles(articles.map(a => a.id === article.id ? { ...a, status: newStatus } : a));
    } catch (error) {}
  };

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.author?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const from = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 my-4 sm:my-8 px-4 pb-28">
      
      {/* 1. Page Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="text-blue-600" size={28} /> 
            {t('articles.mgmt_title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium italic">
            {t('articles.mgmt_subtitle')}
          </p>
        </div>
        
        <div className="relative z-10 flex gap-3">
          <button 
            onClick={() => setIsTaxonomyModalOpen(true)}
            className="shrink-0 bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all font-bold text-sm shadow-sm active:translate-y-0 active:shadow-none"
          >
            <FolderTree size={18} className="text-blue-600" />
            <span className="hidden sm:inline">{t('articles.cat_tag_title')}</span>
          </button>

          <button 
            onClick={handleCreateNew}
            className="shrink-0 bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-sm shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>{t('articles.create_new')}</span>
          </button>
        </div>

        <div className="absolute right-0 top-0 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-700"></div>
      </div>

      {/* 2. Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('articles.search_mgmt_placeholder')} 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium" 
              value={searchTerm} 
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }} 
            />
          </div>
          <div className="text-sm text-slate-500 font-medium px-2 shrink-0">
            {t('audit.found_total', { count: totalItems })}
          </div>
        </div>
      </div>

      {/* 3. Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
            <Loader2 size={36} className="animate-spin text-blue-600 mb-4" />
            <p className="font-medium text-sm">{t('common.loading')}</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-slate-50 p-5 rounded-full mb-4">
              <BookOpen size={48} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">{t('articles.no_articles')}</h3>
            <p className="text-slate-500 text-sm max-w-sm">
              {t('articles.no_articles_desc')}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="overflow-x-auto relative flex-1">
              <table className={`w-full text-left border-collapse transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4 pl-6 w-[40%] whitespace-nowrap">{t('articles.article_title')}</th>
                    <th className="p-4 w-[20%] whitespace-nowrap">{t('articles.category')}</th>
                    <th className="p-4 w-[20%] whitespace-nowrap">{t('devices.table.colStatus')}</th>
                    <th className="p-4 text-right pr-6 w-[20%] whitespace-nowrap">{t('devices.table.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredArticles.map((article) => (
                    <tr key={article.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">{article.title}</span>
                          <div className="flex items-center gap-2 mt-1">
                             <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                <User size={12} /> {article.author?.username}
                             </div>
                             <span className="text-slate-200">•</span>
                             <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                <Calendar size={12} /> {format(new Date(article.createdAt), 'dd MMM yyyy')}
                             </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border bg-white border-slate-200 text-slate-600">
                           {article.category?.name || t('articles.uncategorized')}
                        </span>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => toggleStatus(article)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                            article.status === 'PUBLISHED' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : article.status === 'HIDDEN'
                            ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {article.status === 'PUBLISHED' ? <Eye size={12} /> : <EyeOff size={12} />}
                          {t(`articles.status.${article.status.toLowerCase()}`)}
                        </button>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => {
                              setPreviewArticleId(article.id);
                              setIsViewModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95"
                            title={t('common.view')}
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => handleEdit(article.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95"
                            title={t('common.edit')}
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(article.id, article.title)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95"
                            title={t('common.delete')}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs mt-auto">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">{t('devices.table.itemsPerPage')}</span>
                <div className="flex gap-1">
                  {PAGE_SIZES.map(size => (
                    <button 
                      key={size} 
                      onClick={() => {
                        setItemsPerPage(size);
                        setCurrentPage(1);
                      }} 
                      className={`px-2 py-1 rounded transition-colors font-bold ${itemsPerPage === size ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-slate-500 font-medium">
                {t('audit.table.showing', { from, to, total: totalItems })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        setCurrentPage={setCurrentPage} 
      />

      {/* Article Form Modal */}
      <ArticleFormModal 
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        articleId={selectedArticleId}
        onSaveSuccess={fetchArticles}
      />

      {/* Taxonomy Modal */}
      <ArticleTaxonomyModal 
        isOpen={isTaxonomyModalOpen}
        onClose={() => setIsTaxonomyModalOpen(false)}
      />

      {/* Preview Modal */}
      <ArticlePreviewModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        articleId={previewArticleId}
      />
    </div>
  );
};

export default ArticleManager;
