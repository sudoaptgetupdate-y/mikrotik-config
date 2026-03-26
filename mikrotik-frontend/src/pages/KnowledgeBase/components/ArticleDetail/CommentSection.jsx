import React from 'react';
import { format } from 'date-fns';
import { MessageCircle, Reply, Trash2, Code, Terminal, Smile, Send, Loader2, X as XIcon } from 'lucide-react';
import { CommentContent } from './CommentFormatting';

const CommentSection = ({
  user,
  comments,
  commentText,
  setCommentText,
  submittingComment,
  replyTo,
  setReplyTo,
  isEmojiPickerOpen,
  setIsEmojiPickerOpen,
  handlePostComment,
  handleDeleteComment,
  insertFormatting,
  insertEmoji,
  textareaRef,
  emojiPickerRef,
  emojis,
  t
}) => {
  return (
    <section id="comments-section" className="space-y-10 scroll-mt-32">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
            <MessageCircle size={20} />
          </div>
          <span>{t('common.comments')} <span className="text-slate-400 font-bold ml-1">({comments.length})</span></span>
        </h3>
      </div>

      {/* Comment Form */}
      <div className="bg-slate-50/80 rounded-[40px] p-8 sm:p-10 border border-slate-200/60 shadow-inner relative">
        <div className="absolute top-0 right-0 size-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        
        {replyTo && (
          <div className="mb-6 flex items-center justify-between bg-blue-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 animate-in slide-in-from-top-4 duration-300 relative z-20">
            <div className="flex items-center gap-3">
              <Reply size={16} />
              {t('articles.replying_to', { name: replyTo.user.username })}
            </div>
            <button onClick={() => setReplyTo(null)} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-lg transition-colors">
              <XIcon size={14} />
            </button>
          </div>
        )}
        
        <form onSubmit={handlePostComment} className="relative z-10">
          <div className="flex items-center gap-1 mb-4 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
            <button
              type="button"
              onClick={() => insertFormatting('inline')}
              className="px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-blue-600 transition-all flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest active:scale-95"
              title="Inline Code ( ` )"
            >
              <Code size={16} />
              Code
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() => insertFormatting('block')}
              className="px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-blue-600 transition-all flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest active:scale-95"
              title="Script Block ( ``` )"
            >
              <Terminal size={16} />
              Script
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <div ref={emojiPickerRef} className="relative">
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest active:scale-95 ${isEmojiPickerOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}`}
                title="Emojis"
              >
                <Smile size={16} />
                Emoji
              </button>
              
              {isEmojiPickerOpen && (
                <div className="absolute bottom-full mb-4 left-0 bg-white border border-slate-200 rounded-[32px] shadow-2xl p-4 z-[120] w-[280px] animate-in zoom-in-95 duration-200 border-b-4 border-b-blue-600">
                  <div className="grid grid-cols-5 gap-2">
                    {emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="size-11 flex items-center justify-center text-2xl hover:bg-slate-50 rounded-xl transition-all active:scale-90 hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex justify-center">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Expression</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={user ? t('articles.write_comment') : t('articles.login_to_comment')}
            disabled={!user || submittingComment}
            className="w-full bg-white border border-slate-200 rounded-[32px] p-6 text-[15px] focus:ring-[12px] focus:ring-blue-500/5 focus:border-blue-500/30 transition-all min-h-[160px] outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          />
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={!user || !commentText.trim() || submittingComment}
              className="bg-slate-900 text-white px-10 py-4 rounded-[20px] font-black uppercase tracking-[0.15em] text-[11px] flex items-center gap-3 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-900/20 hover:shadow-blue-600/30"
            >
              {submittingComment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {t('common.send')}
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-10 mt-16">
        {comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className="group animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex gap-6">
                <div className="size-14 bg-white rounded-2xl flex items-center justify-center text-slate-900 font-black text-lg border-2 border-slate-100 shadow-sm uppercase shrink-0 transition-transform group-hover:scale-105">
                  {comment.user.firstName?.charAt(0) || comment.user.username?.charAt(0)}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-900 text-base">{comment.user.username}</span>
                      <div className="size-1 bg-slate-200 rounded-full" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(comment.createdAt), 'dd MMM yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      {user && (
                        <button 
                          onClick={() => {
                            setReplyTo(comment);
                            document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm transition-all"
                        >
                          <Reply size={14} /> {t('articles.reply')}
                        </button>
                      )}
                      {(user?.id === comment.userId || user?.role === 'SUPER_ADMIN') && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm transition-all">
                          <Trash2 size={14} /> {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200/60 shadow-sm relative group-hover:border-blue-100 transition-colors">
                    <CommentContent content={comment.content} />
                    <div className="absolute top-4 right-4 text-[20px] opacity-[0.03] select-none pointer-events-none font-black italic uppercase">MIKROTIK</div>
                  </div>

                  {comment.replies?.length > 0 && (
                    <div className="mt-6 ml-8 pl-8 border-l-4 border-slate-100 space-y-8">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="group/reply space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="size-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 font-black text-xs border border-slate-200 uppercase">
                                {reply.user.username.charAt(0)}
                              </div>
                              <span className="font-black text-slate-900 text-sm">{reply.user.username}</span>
                              <div className="size-1 bg-slate-200 rounded-full" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(reply.createdAt), 'dd MMM yyyy')}</span>
                            </div>
                            {(user?.id === reply.userId || user?.role === 'SUPER_ADMIN') && (
                              <button onClick={() => handleDeleteComment(reply.id, true, comment.id)} className="opacity-0 group-hover/reply:opacity-100 transition-all text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 translate-x-2 group-hover/reply:translate-x-0">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <div className="bg-slate-50/50 p-5 rounded-[24px] border border-slate-100 group-hover/reply:border-blue-50 transition-colors">
                            <CommentContent content={reply.content} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-200">
            <div className="size-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 border border-slate-100 mx-auto mb-6 shadow-sm">
              <MessageCircle size={40} />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px]">{t('articles.no_comments_yet')}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CommentSection;
