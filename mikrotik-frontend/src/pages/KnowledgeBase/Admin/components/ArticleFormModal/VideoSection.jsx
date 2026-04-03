import React, { useState, useRef } from 'react';
import { Video, Link, Upload, X, Film, AlertCircle, Loader2, Copy, Play, Trash2, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import articleService from '../../../../../services/articleService';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const VideoSection = ({ articleId, videos, setVideos, onInsert }) => {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
  const [externalUrl, setExternalUrl] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error(t('articles.video.invalid_type', 'กรุณาเลือกไฟล์วิดีโอเท่านั้น'));
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      toast.error(t('articles.video.too_large', 'ไฟล์วิดีโอมีขนาดใหญ่เกินไป (จำกัด 500MB)'));
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      const uploadFormData = new FormData();
      uploadFormData.append('video', file);
      if (articleId) uploadFormData.append('articleId', articleId);

      const res = await articleService.uploadVideo(uploadFormData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });
      
      // Add to list
      setVideos(prev => [...prev, res]);
      toast.success(t('articles.video.upload_success', 'อัปโหลดวิดีโอเรียบร้อยแล้ว'));
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error(t('articles.video.upload_error', 'เกิดข้อผิดพลาดในการอัปโหลดวิดีโอ'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddExternal = () => {
    if (!externalUrl) return;
    
    if (onInsert) {
      onInsert(externalUrl);
      toast.success(t('articles.video.inserted', 'แทรกวิดีโอในเนื้อหาแล้ว'));
    } else {
      const shortcode = `[video:${externalUrl}]`;
      navigator.clipboard.writeText(shortcode);
      toast.success(t('articles.video.shortcode_copied', 'คัดลอก Shortcode แล้ว'));
    }
    setExternalUrl('');
  };

  const deleteVideo = async (video) => {
    const result = await Swal.fire({
      title: t('common.are_you_sure'),
      text: t('articles.video.delete_confirm', 'คุณต้องการลบวิดีโอนี้ออกจากคลังหรือไม่?'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-[32px] p-8 border border-slate-100 shadow-2xl',
        confirmButton: 'bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-rose-200 transition-all active:scale-95 ml-3',
        cancelButton: 'px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all'
      }
    });

    if (result.isConfirmed) {
      try {
        await articleService.deleteVideo(video.id);
        setVideos(prev => prev.filter(v => v.id !== video.id));
        toast.success(t('common.deleted_success'));
      } catch (error) {
        toast.error(t('common.error_default'));
      }
    }
  };

  const copyShortcode = (url) => {
    const shortcode = `[video:${url}]`;
    navigator.clipboard.writeText(shortcode);
    toast.success(t('articles.video.shortcode_copied', 'คัดลอก Shortcode สำหรับใส่ในเนื้อหาแล้ว'));
  };

  const handleInsert = (video) => {
    if (onInsert) {
      onInsert(video.url, video.filename);
      toast.success(t('articles.video.inserted', 'แทรกวิดีโอในเนื้อหาแล้ว'));
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
          <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
          {t('articles.video_library', 'Video Library')}
        </h4>
      </div>

      {/* Upload/Link Area */}
      <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="flex bg-white p-1 rounded-xl w-fit shadow-sm border border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'upload' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload size={14} className="inline mr-1.5" /> {t('articles.video.tab_upload', 'Upload File')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'link' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Link size={14} className="inline mr-1.5" /> {t('articles.video.tab_link', 'External Link')}
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-slate-200 bg-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 group ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="video/*"
              className="hidden"
            />
            {isUploading ? (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-indigo-600 px-1">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>{t('common.uploading', 'Uploading...')}</span>
                  </div>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 font-medium text-center">Please do not close this window</p>
              </div>
            ) : (
              <>
                <Video size={24} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    {t('articles.video.click_to_upload', 'Add New Video to Library')}
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="url"
                placeholder="YouTube, Vimeo, or MP4 URL..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
            </div>
            <button 
              type="button"
              onClick={handleAddExternal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
            >
              {onInsert ? t('common.insert', 'Insert') : 'Get Shortcode'}
            </button>
          </div>
        )}
      </div>

      {/* Video List */}
      <div className="space-y-3">
        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center justify-between">
          <span>{t('articles.video.stored_videos', 'Stored Videos')} ({videos.length})</span>
          {videos.length > 0 && <span className="text-indigo-500 text-[8px] animate-pulse">Ready to embed</span>}
        </h5>

        {videos.length === 0 ? (
          <div className="py-10 border border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-300">
            <Film size={32} strokeWidth={1} />
            <p className="text-[10px] font-bold uppercase tracking-widest">{t('articles.video.no_videos', 'No videos in library')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {videos.map((video) => (
              <div 
                key={video.id}
                className="group bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-indigo-200 p-4 rounded-2xl flex items-center gap-4 transition-all"
              >
                <div className="size-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-all shadow-sm">
                  <Play size={20} fill="currentColor" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-700 truncate mb-0.5 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                    {video.filename || 'Unnamed Video'}
                  </p>
                  <p className="text-[9px] font-medium text-slate-400 truncate max-w-[150px]">
                    {video.url}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleInsert(video)}
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    title="Insert into Editor"
                  >
                    <PlusCircle size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyShortcode(video.url)}
                    className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    title="Copy Shortcode"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteVideo(video)}
                    className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-start gap-3">
        <AlertCircle size={16} className="text-indigo-500 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">{t('articles.video.guide_title', 'How to use')}</p>
          <p className="text-[9px] text-indigo-600/70 font-medium leading-relaxed">
            {t('articles.video.guide_desc', 'คัดลอก Shortcode ของวิดีโอที่ต้องการ แล้วนำไปวางใน Content Editor เพื่อแสดงผลในตำแหน่งที่ต้องการ')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoSection;
