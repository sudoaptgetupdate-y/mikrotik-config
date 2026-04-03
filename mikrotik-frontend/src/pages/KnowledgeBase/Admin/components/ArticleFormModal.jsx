import React, { useState, useEffect, Fragment } from 'react';
import { X, Layout, CheckCircle, Loader2 } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../context/AuthContext';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

// Services
import articleService from '../../../../services/articleService';

// Sub-components
import EditorSection from './ArticleFormModal/EditorSection';
import AttachmentSection from './ArticleFormModal/AttachmentSection';
import PublishSettings from './ArticleFormModal/PublishSettings';
import TagManager from './ArticleFormModal/TagManager';
import ThumbnailUploader from './ArticleFormModal/ThumbnailUploader';
import VideoSection from './ArticleFormModal/VideoSection';

const ArticleFormModal = ({ isOpen, onClose, articleId, onSaveSuccess }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '', content: '', excerpt: '', thumbnail: '', videoUrl: '',
    categoryId: '', status: 'DRAFT', visibility: 'PUBLIC', slug: '', tagNames: [], isPinned: false
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [attachments, setAttachments] = useState([]);

  // 1. Initial Data Fetching
  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
      setSelectedFile(null);
      setPreviewUrl('');
      if (articleId) {
        fetchArticle();
      } else {
        setFormData({
          title: '', content: '', excerpt: '', thumbnail: '', 
          categoryId: '', status: 'DRAFT', visibility: 'PUBLIC', slug: '', tagNames: [], isPinned: false
        });
        setAttachments([]);
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
          videoUrl: article.videoUrl || '',
          categoryId: article.categoryId || '',
          status: article.status || 'DRAFT',
          visibility: article.visibility || 'PUBLIC',
          slug: article.slug || '',
          tagNames: article.tags ? article.tags.map(t => t.name) : [],
          isPinned: article.isPinned || false
        });
        setAttachments(article.attachments || []);
      }
    } catch (error) {
      console.error('Failed to fetch article:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
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
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Layout size={20} className="text-blue-600" />
                    <Dialog.Title as="h3" className="font-bold text-lg text-slate-800 tracking-tight">
                      {articleId ? t('articles.edit_article') : t('articles.create_new')}
                    </Dialog.Title>
                  </div>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition shadow-sm border border-slate-100">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-50/30 custom-scrollbar">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900">
                    
                    {/* Main Content (Left Column) */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Title Input */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                            <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                            {t('articles.article_title')}
                          </h4>
                          <input 
                            type="text" 
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-lg text-slate-700" 
                            placeholder={t('articles.article_title') + "..."} 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                            required 
                          />
                        </div>
                      </div>
                      
                      {/* Editor Section */}
                      <EditorSection 
                        content={formData.content} 
                        onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                        fetching={fetching}
                        articleId={articleId}
                        isOpen={isOpen}
                      />

                      {/* Attachment Section */}
                      <AttachmentSection 
                        articleId={articleId}
                        attachments={attachments}
                        setAttachments={setAttachments}
                      />

                      {/* Video Section */}
                      <VideoSection 
                        formData={formData}
                        setFormData={setFormData}
                        articleId={articleId}
                      />
                    </div>

                    {/* Sidebar (Right Column) */}
                    <div className="space-y-6 lg:sticky lg:top-[-20px] h-fit">
                      
                      {/* Publish Settings */}
                      <PublishSettings 
                        formData={formData}
                        setFormData={setFormData}
                        categories={categories}
                        user={user}
                      />

                      {/* Tag Manager */}
                      <TagManager 
                        tagNames={formData.tagNames}
                        setFormData={setFormData}
                        allTags={allTags}
                      />

                      {/* Thumbnail Uploader */}
                      <ThumbnailUploader 
                        formData={formData}
                        setFormData={setFormData}
                        selectedFile={selectedFile}
                        setSelectedFile={setSelectedFile}
                        loading={loading}
                        previewUrl={previewUrl}
                        setPreviewUrl={setPreviewUrl}
                      />
                    </div>
                  </div>
                </form>

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-[40px]">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="px-6 py-2.5 rounded-xl text-slate-400 hover:bg-slate-100 transition text-sm font-bold uppercase tracking-widest"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    type="button" 
                    disabled={loading} 
                    onClick={handleSubmit} 
                    className="px-10 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-black transition-all text-sm font-bold shadow-lg shadow-slate-200 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    {articleId ? t('common.save_changes') : t('articles.create_new')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ArticleFormModal;
