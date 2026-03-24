import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit, Trash2, Folder, 
  Tag as TagIcon, Save, AlertCircle, FolderTree, CheckCircle, Search
} from 'lucide-react';
import articleService from '../../../../services/articleService';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';

const ArticleTaxonomyModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' or 'tags'
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search States
  const [catSearch, setCatSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  // Form States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({ name: '', description: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      fetchData();
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsData, tagsData] = await Promise.all([
        articleService.getCategories(),
        articleService.getTags()
      ]);
      setCategories(catsData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to fetch taxonomy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await articleService.updateCategory(currentCategory.id, currentCategory);
        Swal.fire({
          title: t('articles.toast.cat_updated'),
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-[32px] p-8 border border-slate-100 shadow-2xl',
            title: 'text-2xl font-black text-slate-800 tracking-tight'
          }
        });
      } else {
        await articleService.createCategory(currentCategory);
        Swal.fire({
          title: t('articles.toast.cat_created'),
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-[32px] p-8 border border-slate-100 shadow-2xl',
            title: 'text-2xl font-black text-slate-800 tracking-tight'
          }
        });
      }
      setIsCategoryModalOpen(false);
      setCurrentCategory({ name: '', description: '' });
      fetchData();
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
  };

  const handleDeleteCategory = async (id, name) => {
    const result = await Swal.fire({
      title: t('articles.delete_cat_confirm'),
      text: `${t('articles.delete_cat_confirm')} "${name}"?`,
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
        await articleService.deleteCategory(id);
        fetchData();
        Swal.fire({
          title: t('common.finish'),
          icon: 'success',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-[32px] p-8 border border-slate-100 shadow-2xl',
            title: 'text-2xl font-black text-slate-800 tracking-tight',
            confirmButton: 'bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-95'
          }
        });
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

  const handleDeleteTag = async (id, name) => {
    const result = await Swal.fire({
      title: t('articles.delete_tag_confirm'),
      text: `${t('articles.delete_tag_confirm')} "#${name}"?`,
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
        await articleService.deleteTag(id);
        fetchData();
        Swal.fire({
          title: t('common.finish'),
          text: t('articles.toast.tag_deleted'),
          icon: 'success',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-[32px] p-8 border border-slate-100 shadow-2xl',
            title: 'text-2xl font-black text-slate-800 tracking-tight',
            htmlContainer: 'text-sm text-slate-500 font-medium mt-3',
            confirmButton: 'bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-95'
          }
        });
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


  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(catSearch.toLowerCase()) || 
    c.description?.toLowerCase().includes(catSearch.toLowerCase())
  );

  const filteredTags = tags.filter(t => 
    t.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 pointer-events-none invisible'}`}>
      <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />

      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 transition-all duration-300 transform flex flex-col ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <FolderTree size={20} className="text-blue-600" />
            {t('articles.cat_tag_title')}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition shadow-sm border border-slate-100"><X size={20} /></button>
        </div>

        {/* 🆕 Tab Navigation */}
        <div className="flex bg-white px-6 border-b border-slate-100">
           {[
             { id: 'categories', label: t('articles.categories_title'), icon: Folder },
             { id: 'tags', label: t('articles.tags_title'), icon: TagIcon }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all border-b-2 relative ${
                 activeTab === tab.id 
                 ? 'text-blue-600 border-blue-600' 
                 : 'text-slate-400 border-transparent hover:text-slate-600'
               }`}
             >
               <tab.icon size={16} />
               {tab.label}
               {activeTab === tab.id && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 animate-in slide-in-from-left-full duration-300" />}
             </button>
           ))}
        </div>
        
        {/* Modal Body */}
        <div className="p-5 sm:p-8 space-y-8 max-h-[65vh] overflow-y-auto bg-slate-50/30 custom-scrollbar">
          
          {activeTab === 'categories' ? (
            /* 📂 Categories Tab Content */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="relative flex-1 w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder={t('common.search')}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-xs font-bold transition-all"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => { setIsEditing(false); setCurrentCategory({ name: '', description: '' }); setIsCategoryModalOpen(true); }}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-blue-200 active:scale-95 shrink-0"
                >
                  <Plus size={14} />
                  {t('articles.add_category')}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black">
                      <th className="p-4 pl-6">{t('articles.category_name')}</th>
                      <th className="p-4">{t('articles.description')}</th>
                      <th className="p-4 w-24 text-right pr-6">{t('users.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan="3" className="p-4 pl-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td></tr>)
                    ) : filteredCategories.length > 0 ? (
                      filteredCategories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase">{cat._count?.articles}</span>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-500 max-w-xs truncate">{cat.description || '-'}</td>
                          <td className="p-4 text-right pr-6">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => { setIsEditing(true); setCurrentCategory(cat); setIsCategoryModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all"><Edit size={14} /></button>
                              <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg shadow-sm border border-transparent hover:border-slate-100 transition-all"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="p-12 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">{t('common.no_data')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 🏷️ Tags Tab Content */
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder={t('common.search')}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-xs font-bold transition-all"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="py-2 min-h-[200px]">
                {loading ? (
                  <div className="flex flex-wrap gap-2 animate-pulse">{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-8 w-16 bg-slate-100 rounded-full"></div>)}</div>
                ) : filteredTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {filteredTags.map((tag) => (
                      <div key={tag.id} className="flex items-center gap-1.5 bg-slate-50 pl-3 pr-1 py-1 rounded-xl group hover:bg-indigo-50 border border-slate-100 transition-all">
                        <span className="text-xs font-black text-slate-600 group-hover:text-indigo-600">#{tag.name}</span>
                        <span className="text-[10px] bg-white text-slate-400 px-1.5 rounded-lg font-bold border border-slate-100">{tag._count?.articles}</span>
                        <button onClick={() => handleDeleteTag(tag.id, tag.name)} className="p-1 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-200 font-black uppercase tracking-widest text-[10px]">{t('common.no_data')}</div>
                )}
                
                <div className="mt-10 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3 text-indigo-700">
                  <AlertCircle size={18} className="shrink-0 text-indigo-400" />
                  <p className="text-[10px] font-bold leading-relaxed opacity-80">{t('articles.tag_notice')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-3xl">
          <button type="button" onClick={onClose} className="px-8 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-black transition text-sm font-bold shadow-lg shadow-slate-200 flex items-center gap-2">
            <CheckCircle size={18} /> {t('common.finish')}
          </button>
        </div>

        {/* Category Form Modal */}
        {isCategoryModalOpen && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                   <Plus size={18} className="text-blue-600" />
                   {isEditing ? t('articles.edit_category') : t('articles.add_category')}
                </h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"><X size={20} /></button>
              </div>
              <form onSubmit={handleCategorySubmit} className="p-6 space-y-4 bg-white">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">{t('articles.category_name')} *</label>
                  <input type="text" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700" placeholder="e.g. VPN Setup" value={currentCategory.name} onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">{t('articles.description')}</label>
                  <textarea rows="2" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700 resize-none" placeholder={t('articles.cat_desc_placeholder')} value={currentCategory.description || ''} onChange={(e) => setCurrentCategory({...currentCategory, description: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all">{t('common.cancel')}</button>
                  <button type="submit" className="flex-1 py-2.5 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md"><Save size={18} /> {t('common.save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleTaxonomyModal;
