import React, { useState, useRef } from 'react';
import { Video, Link, Upload, X, Film, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import articleService from '../../../../../services/articleService';
import toast from 'react-hot-toast';

const VideoSection = ({ formData, setFormData, articleId }) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(formData.videoUrl && !formData.videoUrl.includes('/api/articles/videos/') ? 'link' : 'upload');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('video/')) {
      toast.error(t('articles.video.invalid_type', 'กรุณาเลือกไฟล์วิดีโอเท่านั้น'));
      return;
    }

    // Check file size (e.g., 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error(t('articles.video.too_large', 'ไฟล์วิดีโอมีขนาดใหญ่เกินไป (จำกัด 500MB)'));
      return;
    }

    try {
      setIsUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('video', file);
      if (articleId) uploadFormData.append('articleId', articleId);

      const res = await articleService.uploadVideo(uploadFormData);
      setFormData({ ...formData, videoUrl: res.url });
      toast.success(t('articles.video.upload_success', 'อัปโหลดวิดีโอเรียบร้อยแล้ว'));
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error(t('articles.video.upload_error', 'เกิดข้อผิดพลาดในการอัปโหลดวิดีโอ'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeVideo = () => {
    setFormData({ ...formData, videoUrl: '' });
  };

  const isExternal = formData.videoUrl && !formData.videoUrl.includes('/api/articles/videos/');

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
          <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
          {t('articles.video_content', 'Video Content')}
        </h4>
        
        {formData.videoUrl && (
          <button 
            onClick={removeVideo}
            className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1 hover:text-rose-600 transition-colors"
          >
            <X size={12} /> {t('common.remove', 'Remove')}
          </button>
        )}
      </div>

      {!formData.videoUrl ? (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Upload size={14} className="inline mr-1.5" /> {t('articles.video.tab_upload', 'Upload')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'link' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Link size={14} className="inline mr-1.5" /> {t('articles.video.tab_link', 'External Link')}
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 group ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="video/*"
                className="hidden"
              />
              {isUploading ? (
                <Loader2 size={32} className="text-indigo-500 animate-spin" />
              ) : (
                <Video size={32} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
              )}
              <div className="text-center">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {isUploading ? t('common.uploading', 'Uploading...') : t('articles.video.click_to_upload', 'Click to upload video')}
                </p>
                <p className="text-[9px] text-slate-400 font-medium mt-1 uppercase">MP4, WebM (Max 500MB)</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                />
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1.5 px-1 font-medium">
                <AlertCircle size={12} /> Supports YouTube, Vimeo, and direct MP4 links
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
          <div className="aspect-video flex items-center justify-center">
            {isExternal ? (
              <div className="flex flex-col items-center gap-3">
                <Film size={48} className="text-white/20" />
                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest">{t('articles.video.external_preview', 'External Video Attached')}</p>
                <code className="text-[10px] text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full max-w-[200px] truncate">{formData.videoUrl}</code>
              </div>
            ) : (
              <video 
                src={formData.videoUrl} 
                className="w-full h-full object-contain"
                controls
              />
            )}
          </div>
          
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
             <div className="flex flex-col items-center gap-1">
                <p className="text-white text-[10px] font-black uppercase tracking-[0.2em]">{isExternal ? 'Linked Video' : 'Uploaded Video'}</p>
                <p className="text-white/50 text-[9px] font-medium max-w-[250px] truncate px-4">{formData.videoUrl}</p>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => setFormData({ ...formData, videoUrl: '' })}
                  className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                >
                  <X size={14} /> {t('common.remove')}
                </button>
                <button 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 backdrop-blur-md border border-white/10"
                >
                  <Upload size={14} /> {t('common.replace', 'Replace')}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="video/*"
                  className="hidden"
                />
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoSection;
