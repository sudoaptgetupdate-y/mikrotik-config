import React, { useState, useEffect, useRef, Fragment } from 'react';
import { 
  X, Save, AlertCircle, Upload, Tag as TagIcon, 
  Layout, Settings, Image as ImageIcon, CheckCircle, ChevronLeft, Search, Plus, Loader2,
  Terminal, Code as CodeIcon
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import articleService from '../../../../services/articleService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { getToken } from '../../../../utils/apiClient';

const ArticleFormModal = ({ isOpen, onClose, articleId, onSaveSuccess }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const editorRef = useRef(null);
  const quillInstance = useRef(null);
  const contentInjected = useRef(false);

  const [formData, setFormData] = useState({
    title: '', content: '', excerpt: '', thumbnail: '', 
    categoryId: '', status: 'DRAFT', slug: '', tagNames: [], isPinned: false
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // 1. Initial Data Fetching
  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      contentInjected.current = false;
      setSelectedFile(null);
      setPreviewUrl('');
      if (articleId) {
        fetchArticle();
      } else {
        setFormData({
          title: '', content: '', excerpt: '', thumbnail: '', 
          categoryId: '', status: 'DRAFT', slug: '', tagNames: [], isPinned: false
        });
      }
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  }, [isOpen, articleId]);

  const fetchInitialData = async () => {
    try {
      const [cats, tags] = await Promise.all([
        articleService.getCategories(),
        articleService.getTags()
      ]);
      setCategories(cats);
      setAllTags(tags);
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    }
  };

  const fetchArticle = async () => {
    try {
      setFetching(true);
      const article = await articleService.getArticleById(articleId);
      if (article) {
        setFormData({
          title: article.title || '',
          content: article.content || '',
          excerpt: article.excerpt || '',
          thumbnail: article.thumbnail || '',
          categoryId: article.categoryId || '',
          status: article.status || 'DRAFT',
          slug: article.slug || '',
          tagNames: article.tags ? article.tags.map(t => t.name) : [],
          isPinned: article.isPinned || false
        });
      }
    } catch (error) {
      console.error('Failed to fetch article:', error);
    } finally {
      setFetching(false);
    }
  };

  // 2. Quill Initialization (With retry logic for Headless UI Mounting)
  useEffect(() => {
    let quillTimer;
    
    const initQuill = () => {
      if (isOpen && editorRef.current && !quillInstance.current) {
        const container = editorRef.current;
        
        // Clean up
        container.innerHTML = '';
        const parent = container.parentElement;
        const oldToolbar = parent.querySelector('.ql-toolbar');
        if (oldToolbar) oldToolbar.remove();

        const quill = new Quill(container, {
          theme: 'snow',
          modules: {
            toolbar: {
              container: [
                [{ 'header': [1, 2, 3, 4, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['code', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['blockquote'],
                ['link', 'image'],
                ['clean']
              ]
            }
          }
        });

        // Custom Icons
        const toolbar = quill.getModule('toolbar');
        const codeButton = toolbar.container.querySelector('.ql-code');
        const codeBlockButton = toolbar.container.querySelector('.ql-code-block');
        
        if (codeButton) {
          codeButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
          codeButton.title = "Inline Code";
        }
        if (codeBlockButton) {
          codeBlockButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>';
          codeBlockButton.title = "Script Block (MikroTik)";
        }

        quill.getModule('toolbar').addHandler('image', imageHandler);

        quill.on('text-change', () => {
          const html = quill.root.innerHTML;
          const cleanContent = (html === '<p><br></p>' || html === '') ? '' : html;
          setFormData(prev => ({ ...prev, content: cleanContent }));
        });

        quillInstance.current = quill;
        
        // If we had content, inject it now
        if (formData.content && !contentInjected.current) {
          quill.root.innerHTML = formData.content;
          contentInjected.current = true;
        }
      } else if (isOpen && !quillInstance.current) {
        // If ref is not ready, retry in 50ms
        quillTimer = setTimeout(initQuill, 50);
      }
    };

    if (isOpen) {
      initQuill();
    }

    return () => {
      clearTimeout(quillTimer);
      if (!isOpen) {
        quillInstance.current = null;
        contentInjected.current = false;
      }
    };
  }, [isOpen]);

  // 3. Separate Injection for Async Data Fetching
  useEffect(() => {
    if (!fetching && quillInstance.current && formData.content && !contentInjected.current) {
      quillInstance.current.root.innerHTML = formData.content;
      contentInjected.current = true;
    }
  }, [fetching, formData.content]);

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return Swal.fire({
        title: t('common.error'),
        text: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB",
        icon: 'error',
        confirmButtonText: 'ตกลง'
      });
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setSelectedFile(file);
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file'); input.setAttribute('accept', 'image/*'); input.click();
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        return Swal.fire({
          title: t('common.error'),
          text: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB",
          icon: 'error',
          confirmButtonText: 'ตกลง'
        });
      }

      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      if (articleId) formDataUpload.append('articleId', articleId);
      try {
        const res = await articleService.uploadImage(formDataUpload);
        if (quillInstance.current) {
          const range = quillInstance.current.getSelection();
          quillInstance.current.insertEmbed(range?.index || 0, 'image', res.url);
        }
      } catch (error) {
        console.error("Upload error:", error);
        let errorText = t('common.error_default');
        
        if (error.response?.status === 413) {
          errorText = "ไฟล์มีขนาดใหญ่เกินไป (จำกัด 5MB) หรือ Server ไม่รองรับขนาดไฟล์นี้";
        } else if (error.response?.data?.error) {
          errorText = error.response.data.error;
        }

        Swal.fire({
          title: t('common.error'),
          text: errorText,
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
  };

  const handleTagInputChange = (value) => {
    setTagInput(value);
    if (value.trim()) {
      const filtered = allTags.filter(tag => 
        tag.name.toLowerCase().includes(value.toLowerCase()) && 
        !formData.tagNames.includes(tag.name)
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addTag = (tagName) => {
    const value = tagName.trim();
    if (value && !formData.tagNames.includes(value)) {
      setFormData(prev => ({ ...prev, tagNames: [...prev.tagNames, value] }));
    }
    setTagInput('');
    setSuggestions([]);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({ ...prev, tagNames: prev.tagNames.filter(t => t !== tagToRemove) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      let errorMsg = t('articles.validation.title_content_required');
      if (!formData.title && formData.content) errorMsg = t('articles.validation.title_required');
      if (formData.title && !formData.content) errorMsg = t('articles.validation.content_required');

      return Swal.fire({
        title: t('common.error'),
        text: errorMsg,
        icon: 'warning',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-[32px] p-8 border border-slate-100 shadow-2xl',
          title: 'text-2xl font-black text-slate-800 tracking-tight',
          htmlContainer: 'text-sm text-slate-500 font-medium mt-3',
          confirmButton: 'bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-95'
        }
      });
    }
    try {
      setLoading(true);
      
      let finalThumbnailUrl = formData.thumbnail;

      if (selectedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('image', selectedFile);
        if (articleId) formDataUpload.append('articleId', articleId);
        
        try {
          const res = await articleService.uploadImage(formDataUpload);
          finalThumbnailUrl = res.url;
        } catch (uploadError) {
          console.error("Thumbnail upload error:", uploadError);
          let errorText = "ไม่สามารถอัปโหลดรูปภาพหน้าปกได้";
          if (uploadError.response?.status === 413) {
            errorText += " (ไฟล์มีขนาดใหญ่เกินไป จำกัด 5MB)";
          } else if (uploadError.response?.data?.error) {
            errorText = uploadError.response.data.error;
          }
          throw new Error(errorText);
        }
      }

      const submissionData = { ...formData, thumbnail: finalThumbnailUrl };
      const savePromise = articleId 
        ? articleService.updateArticle(articleId, submissionData)
        : articleService.createArticle(submissionData);

      toast.promise(savePromise, {
        loading: t('common.saving'),
        success: articleId ? t('articles.toast.updated') : t('articles.toast.created'),
        error: (err) => err.message || t('common.error_default')
      });

      await savePromise;
      onSaveSuccess();
      onClose();
    } catch (error) {
      if (error?.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error(t('common.error_default'));
      }
    } finally {
      setLoading(false);
    }
  };

  const formatImageUrlPreview = (url) => {
    if (!url) return '';
    if (url.startsWith('blob:')) return url;
    return url;
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden relative transform flex flex-col transition-all">
                
                <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Layout size={20} className="text-blue-600" />
                    <Dialog.Title as="h3" className="font-bold text-lg text-slate-800 tracking-tight">
                      {articleId ? t('articles.edit_article') : t('articles.create_new')}
                    </Dialog.Title>
                  </div>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition shadow-sm border border-slate-100"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-50/30 custom-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2"><div className="w-1 h-3 bg-blue-500 rounded-full"></div>{t('articles.article_title')}</h4>
                          <input type="text" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-lg text-slate-700" placeholder={t('articles.article_title') + "..."} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[550px]">
                        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between rounded-t-3xl">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2"><div className="w-1 h-3 bg-indigo-500 rounded-full"></div>{t('articles.content_editor')}</h4>
                          <div className="flex items-center gap-2 text-[9px] font-bold text-blue-400 bg-blue-50 px-2.5 py-1 rounded-lg"><AlertCircle size={12} />{t('articles.editor_hint')}</div>
                        </div>
                        <div className="flex-1 p-2 relative">
                          {fetching && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-b-3xl">
                               <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('common.loading')}</span>
                            </div>
                          )}
                          <div ref={editorRef} style={{ border: 'none', minHeight: '450px' }} className="text-slate-900" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 lg:sticky lg:top-[-20px] h-fit">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><div className="w-1 h-3 bg-emerald-500 rounded-full"></div>{t('articles.publish_settings')}</h4>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('devices.table.colStatus')}</label>
                            <div className="grid grid-cols-2 gap-2">{['DRAFT', 'PUBLISHED'].map(s => (<button key={s} type="button" onClick={() => setFormData({...formData, status: s})} className={`py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${formData.status === s ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}>{t(`articles.status.${s.toLowerCase()}`)}</button>))}</div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{t('articles.category')}</label>
                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}><option value="">{t('articles.no_category')}</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select>
                          </div>

                          {user?.role === 'SUPER_ADMIN' && (
                            <div className="pt-4 border-t border-slate-50">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative inline-flex items-center">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={formData.isPinned}
                                    onChange={(e) => setFormData({...formData, isPinned: e.target.checked})}
                                  />
                                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors uppercase tracking-widest">{t('articles.pin_article')}</span>
                              </label>
                              <p className="text-[10px] text-slate-400 mt-2 ml-14 font-medium italic leading-tight">
                                {t('articles.pin_hint')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><div className="w-1 h-3 bg-purple-500 rounded-full"></div>{t('articles.tags')}</h4>
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-1.5">{formData.tagNames.map(tag => (<span key={tag} className="flex items-center gap-1 bg-indigo-50 text-indigo-600 pl-3 pr-1 py-1 rounded-lg text-[10px] font-bold border border-indigo-100">#{tag}<button type="button" onClick={() => removeTag(tag)} className="p-0.5 hover:bg-white rounded-md transition-all"><X size={10} /></button></span>))}</div>
                          <div className="relative"><input type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" placeholder={t('articles.tags_placeholder')} value={tagInput} onChange={e => handleTagInputChange(e.target.value)} onKeyDown={handleTagKeyDown} />{suggestions.length > 0 && (<div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">{suggestions.map(tag => (<button key={tag.id} type="button" onClick={() => addTag(tag.name)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex justify-between items-center border-b border-slate-50 last:border-0"><span>#{tag.name}</span><Plus size={12} className="opacity-40" /></button>))}</div>)}</div>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><div className="w-1 h-3 bg-orange-500 rounded-full"></div>{t('articles.thumbnail_image')}</h4>
                        <div className="space-y-4">
                          {(previewUrl || formData.thumbnail) && (
                            <div className="relative group aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-inner">
                              <img src={formatImageUrlPreview(previewUrl || formData.thumbnail)} className="w-full h-full object-cover" alt="Thumbnail" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                                <button type="button" onClick={() => {
                                  setFormData({...formData, thumbnail: ''});
                                  setSelectedFile(null);
                                  if (previewUrl) {
                                    URL.revokeObjectURL(previewUrl);
                                    setPreviewUrl('');
                                  }
                                }} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg active:scale-90"><X size={20} /></button>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input type="text" className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all" placeholder={t('articles.thumbnail_hint')} value={selectedFile ? selectedFile.name : formData.thumbnail} onChange={e => setFormData({...formData, thumbnail: e.target.value})} />
                            <label className="cursor-pointer size-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md active:scale-90 shrink-0">{loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}<input type="file" className="hidden" accept="image/*" onChange={handleThumbnailUpload} disabled={loading} /></label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>

                <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-[40px]">
                  <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-slate-400 hover:bg-slate-100 transition text-sm font-bold uppercase tracking-widest">{t('common.cancel')}</button>
                  <button type="button" disabled={loading} onClick={handleSubmit} className="px-10 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-black transition-all text-sm font-bold shadow-lg shadow-slate-200 flex items-center gap-2 active:scale-95 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}{articleId ? t('common.save_changes') : t('articles.create_new')}</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `.ql-container.ql-snow { border: none !important; font-family: 'Inter', sans-serif; font-size: 16px; } .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f1f5f9 !important; background: #f8fafc; padding: 0.75rem 1.25rem !important; position: sticky; top: 0; z-index: 20; } .ql-editor { min-height: 400px; color: #1e293b; padding: 1.25rem !important; line-height: 1.7; } .ql-editor.ql-blank::before { color: #cbd5e1; font-style: normal; font-weight: 600; left: 1.25rem !important; } .ql-editor pre.ql-syntax, .ql-editor .ql-code-block-container { background-color: #0f172a !important; color: #f8fafc !important; border-radius: 1rem !important; padding: 1rem !important; margin: 1rem 0 !important; font-family: 'Fira Code', monospace; } .ql-editor .ql-code-block { white-space: pre !important; }` }} />
      </Dialog>
    </Transition>
  );
};

export default ArticleFormModal;
