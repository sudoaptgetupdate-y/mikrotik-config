import React from 'react';
import { Play } from 'lucide-react';

const VideoPlayer = ({ videoUrl, title }) => {
  if (!videoUrl) return null;

  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const isVimeo = videoUrl.includes('vimeo.com');

  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getVimeoId = (url) => {
    const match = url.match(/vimeo\.com\/(?:video\/|channels\/|groups\/|([^/]*)\/videos\/|)([^?]*)/);
    return match ? match[2] : null;
  };

  const renderPlayer = () => {
    if (isYouTube) {
      const id = getYouTubeId(videoUrl);
      if (!id) return null;
      return (
        <iframe
          className="w-full aspect-video"
          src={`https://www.youtube.com/embed/${id}`}
          title={title || "YouTube video player"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    }

    if (isVimeo) {
      const id = getVimeoId(videoUrl);
      if (!id) return null;
      return (
        <iframe
          className="w-full aspect-video"
          src={`https://player.vimeo.com/video/${id}`}
          title={title || "Vimeo video player"}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    }

    // Local Video or direct link
    return (
      <video 
        className="w-full rounded-2xl shadow-lg border border-slate-100" 
        controls
        preload="metadata"
      >
        <source src={videoUrl} />
        Your browser does not support the video tag.
      </video>
    );
  };

  return (
    <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
          <Play size={20} fill="currentColor" />
        </div>
        <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Video Tutorial / Presentation</h3>
      </div>
      
      <div className="rounded-[32px] overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-100 bg-slate-900">
        {renderPlayer()}
      </div>
    </div>
  );
};

export default VideoPlayer;
