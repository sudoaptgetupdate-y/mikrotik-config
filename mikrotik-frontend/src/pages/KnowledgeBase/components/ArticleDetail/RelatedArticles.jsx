import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { BookOpen, ChevronRight, FileText } from 'lucide-react';

const RelatedArticles = ({ relatedArticles, t, formatImageUrl }) => {
  if (!relatedArticles || relatedArticles.length === 0) return null;

  return (
    <section className="bg-slate-50/50 border-t border-slate-100 p-8 sm:p-12 md:p-16">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
          <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <BookOpen size={20} />
          </div>
          {t('articles.footer_title')}
        </h3>
        <Link to="/knowledge-base" className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:text-blue-700 flex items-center gap-2 group/all">
          {t('common.view')} {t('sidebar.knowledge_base')} 
          <ChevronRight size={14} className="group-hover/all:translate-x-1 transition-transform" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {relatedArticles.map(item => (
          <Link 
            key={item.id} 
            to={`/knowledge-base/${item.slug}`}
            className="group flex flex-col bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
          >
            <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden relative">
              {item.thumbnail ? (
                <img src={formatImageUrl(item.thumbnail)} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-200"><FileText size={48} /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <div className="p-6 flex-1 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  {item.category?.name || t('articles.uncategorized')}
                </span>
                <span className="text-[10px] font-bold text-slate-400">{format(new Date(item.createdAt), 'dd MMM yyyy')}</span>
              </div>
              <h4 className="font-black text-lg text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                {item.title}
              </h4>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RelatedArticles;
