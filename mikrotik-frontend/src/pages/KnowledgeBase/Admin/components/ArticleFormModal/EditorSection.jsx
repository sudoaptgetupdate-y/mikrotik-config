import React, { useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { useTranslation } from 'react-i18next';
import articleService from '../../../../../services/articleService';
import Swal from 'sweetalert2';

const EditorSection = ({ content, onChange, fetching, articleId, isOpen }) => {
  const { t } = useTranslation();
  const editorRef = useRef(null);
  const quillInstance = useRef(null);
  const contentInjected = useRef(false);

  // Initial Quill setup
  useEffect(() => {
    let quillTimer;
    
    const initQuill = () => {
      if (isOpen && editorRef.current && !quillInstance.current) {
        const container = editorRef.current;
        
        // Clean up
        container.innerHTML = '';
        const parent = container.parentElement;
        const oldToolbar = parent?.querySelector('.ql-toolbar');
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
          onChange(cleanContent);
        });

        quillInstance.current = quill;
        
        if (content && !contentInjected.current) {
          quill.root.innerHTML = content;
          contentInjected.current = true;
        }
      } else if (isOpen && !quillInstance.current) {
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

  // Sync content when data is fetched asynchronously
  useEffect(() => {
    if (!fetching && quillInstance.current && content && !contentInjected.current) {
      quillInstance.current.root.innerHTML = content;
      contentInjected.current = true;
    }
  }, [fetching, content]);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file'); 
    input.setAttribute('accept', 'image/*'); 
    input.click();
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

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col min-h-[550px]">
      <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between rounded-t-3xl">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
          {t('articles.content_editor')}
        </h4>
        <div className="flex items-center gap-2 text-[9px] font-bold text-blue-400 bg-blue-50 px-2.5 py-1 rounded-lg">
          <AlertCircle size={12} />
          {t('articles.editor_hint')}
        </div>
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

      <style dangerouslySetInnerHTML={{ __html: `
        .ql-container.ql-snow { border: none !important; font-family: 'Inter', sans-serif; font-size: 16px; } 
        .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f1f5f9 !important; background: #f8fafc; padding: 0.75rem 1.25rem !important; position: sticky; top: 0; z-index: 20; } 
        .ql-editor { min-height: 400px; color: #1e293b; padding: 1.25rem !important; line-height: 1.7; } 
        .ql-editor.ql-blank::before { color: #cbd5e1; font-style: normal; font-weight: 600; left: 1.25rem !important; } 
        .ql-editor pre.ql-syntax, .ql-editor .ql-code-block-container { background-color: #0f172a !important; color: #f8fafc !important; border-radius: 1rem !important; padding: 1rem !important; margin: 1rem 0 !important; font-family: 'Fira Code', monospace; } 
        .ql-editor .ql-code-block { white-space: pre !important; }
      ` }} />
    </div>
  );
};

export default EditorSection;
