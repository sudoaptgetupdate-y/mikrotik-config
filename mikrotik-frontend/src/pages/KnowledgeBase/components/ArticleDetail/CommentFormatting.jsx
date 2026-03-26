import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 relative group/code">
      <pre className="p-5 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[13px] overflow-x-auto border border-slate-800 shadow-inner leading-normal custom-scrollbar pr-14">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className={`absolute top-3 right-3 p-2 rounded-xl border transition-all active:scale-90 flex items-center gap-2 ${
          copied 
            ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' 
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 opacity-0 group-hover/code:opacity-100'
        }`}
        title="Copy Code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied && <span className="text-[9px] font-black uppercase tracking-widest">Copied!</span>}
      </button>
      {!copied && (
        <div className="absolute bottom-3 right-4 text-[9px] font-black text-slate-600 uppercase tracking-widest opacity-40 group-hover/code:opacity-0 transition-opacity">
          CONFIG / SCRIPT
        </div>
      )}
    </div>
  );
};

export const CommentContent = ({ content }) => {
  if (!content) return null;
  
  const parts = content.split(/(```[\s\S]*?```|`[^`]*?`)/g);
  
  return (
    <div className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).trim();
          return <CodeBlock key={i} code={code} />;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-mono text-[14px] border border-blue-100 mx-0.5 font-bold">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};
