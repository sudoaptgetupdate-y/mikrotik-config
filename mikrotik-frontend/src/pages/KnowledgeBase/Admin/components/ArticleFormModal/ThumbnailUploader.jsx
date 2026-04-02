import React from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';

const ThumbnailUploader = ({ 
  formData, 
  setFormData, 
  selectedFile, 
  setSelectedFile, 
  loading,
  previewUrl,
  setPreviewUrl
}) => {
  const { t } = useTranslation();

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

  const formatImageUrlPreview = (url) => {
    if (!url) return '';
    if (url.startsWith('blob:')) return url;
    return url;
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <div className="w-1 h-3 bg-orange-500 rounded-full"></div>
        {t('articles.thumbnail_image')}
      </h4>
      <div className="space-y-4">
        {(previewUrl || formData.thumbnail) && (
          <div className="relative group aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 shadow-inner">
            <img 
              src={formatImageUrlPreview(previewUrl || formData.thumbnail)} 
              className="w-full h-full object-cover" 
              alt="Thumbnail" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
              <button 
                type="button" 
                onClick={() => {
                  setFormData({...formData, thumbnail: ''});
                  setSelectedFile(null);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl('');
                  }
                }} 
                className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
            placeholder={t('articles.thumbnail_hint')} 
            value={selectedFile ? selectedFile.name : formData.thumbnail} 
            onChange={e => setFormData({...formData, thumbnail: e.target.value})} 
          />
          <label className="cursor-pointer size-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-md active:scale-90 shrink-0">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleThumbnailUpload} 
              disabled={loading} 
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailUploader;
