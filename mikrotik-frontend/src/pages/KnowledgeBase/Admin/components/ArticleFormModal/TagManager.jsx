import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TagManager = ({ tagNames, setFormData, allTags }) => {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const handleTagInputChange = (value) => {
    setTagInput(value);
    if (value.trim()) {
      const filtered = allTags.filter(tag => 
        tag.name.toLowerCase().includes(value.toLowerCase()) && 
        !tagNames.includes(tag.name)
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addTag = (tagName) => {
    const value = tagName.trim();
    if (value && !tagNames.includes(value)) {
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
    setFormData(prev => ({ ...prev, tagNames: tagNames.filter(t => t !== tagToRemove) }));
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <div className="w-1 h-3 bg-purple-500 rounded-full"></div>
        {t('articles.tags')}
      </h4>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {tagNames.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-indigo-50 text-indigo-600 pl-3 pr-1 py-1 rounded-lg text-[10px] font-bold border border-indigo-100">
              #{tag}
              <button type="button" onClick={() => removeTag(tag)} className="p-0.5 hover:bg-white rounded-md transition-all">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="relative">
          <input 
            type="text" 
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
            placeholder={t('articles.tags_placeholder')} 
            value={tagInput} 
            onChange={e => handleTagInputChange(e.target.value)} 
            onKeyDown={handleTagKeyDown} 
          />
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {suggestions.map(tag => (
                <button 
                  key={tag.id} 
                  type="button" 
                  onClick={() => addTag(tag.name)} 
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex justify-between items-center border-b border-slate-50 last:border-0"
                >
                  <span>#{tag.name}</span>
                  <Plus size={12} className="opacity-40" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagManager;
