import React, { useState } from 'react';
import { 
  Paperclip, Plus, Loader2, File, Eye, EyeOff, Trash2 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import articleService, { 
  uploadAttachment, 
  deleteAttachment, 
  toggleAttachmentVisibility 
} from '../../../../../services/articleService';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

const AttachmentSection = ({ articleId, attachments, setAttachments }) => {
  const { t } = useTranslation();
  const [uploadingAttach, setUploadingAttach] = useState(false);

  const handleAttachUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!articleId) {
      return Swal.fire({
        title: t('common.error'),
        text: "กรุณาบันทึกบทความก่อนเพิ่มไฟล์แนบ",
        icon: 'warning',
        confirmButtonText: 'ตกลง'
      });
    }

    if (file.size > 1024 * 1024 * 1024) {
      return Swal.fire({
        title: t('common.error'),
        text: "ไฟล์ต้องมีขนาดไม่เกิน 1GB",
        icon: 'error',
        confirmButtonText: 'ตกลง'
      });
    }

    try {
      setUploadingAttach(true);
      await uploadAttachment(articleId, file);
      toast.success("อัปโหลดไฟล์สำเร็จ");
      // Reload attachments
      const article = await articleService.getArticleById(articleId);
      setAttachments(article.attachments || []);
    } catch (error) {
      console.error("Attach upload error:", error);
      toast.error(error.response?.data?.error || "อัปโหลดไฟล์ไม่สำเร็จ");
    } finally {
      setUploadingAttach(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteAttach = async (id) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบไฟล์?",
      text: "ไฟล์จะถูกลบออกจากระบบทันที",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common.yesDelete'),
      cancelButtonText: t('common.cancel'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-[32px] p-8 border border-slate-100 shadow-2xl',
        title: 'text-2xl font-black text-slate-800 tracking-tight',
        confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-rose-200 transition-all active:scale-95 mx-2',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-500 px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 mx-2'
      }
    });

    if (result.isConfirmed) {
      try {
        await deleteAttachment(id);
        setAttachments(attachments.filter(a => a.id !== id));
        toast.success("ลบไฟล์สำเร็จ");
      } catch (error) {
        toast.error("ลบไฟล์ไม่สำเร็จ");
      }
    }
  };

  const handleToggleAttachVisibility = async (id) => {
    try {
      const res = await toggleAttachmentVisibility(id);
      setAttachments(attachments.map(a => a.id === id ? { ...a, isVisible: res.isVisible } : a));
      toast.success(res.isVisible ? "เปิดการดาวน์โหลดไฟล์แล้ว" : "ปิดการดาวน์โหลดไฟล์แล้ว");
    } catch (error) {
      toast.error("ไม่สามารถเปลี่ยนสถานะไฟล์ได้");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <div className="w-1 h-3 bg-blue-600 rounded-full"></div>
          {t('articles.attachments', 'Attachments')}
        </h4>
        {articleId && (
          <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2">
            {uploadingAttach ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            {t('articles.add_file', 'Add File')}
            <input type="file" className="hidden" onChange={handleAttachUpload} disabled={uploadingAttach} />
          </label>
        )}
      </div>

      {!articleId ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <Paperclip size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('articles.save_first_hint', 'Save article first to add attachments')}</p>
        </div>
      ) : attachments.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400">
          <p className="text-xs font-medium italic">{t('articles.no_attachments', 'No attachments yet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attachments.map((file) => (
            <div key={file.id} className="group bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="size-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <File size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate mb-0.5">{file.filename}</p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <span>{file.fileExt.toUpperCase()}</span>
                  <span>•</span>
                  <span>{formatFileSize(file.fileSize)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  type="button" 
                  onClick={() => handleToggleAttachVisibility(file.id)}
                  className={`p-2 rounded-lg transition-colors ${file.isVisible ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                  title={file.isVisible ? "Visible to users" : "Hidden from users"}
                >
                  {file.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button 
                  type="button" 
                  onClick={() => handleDeleteAttach(file.id)}
                  className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachmentSection;
