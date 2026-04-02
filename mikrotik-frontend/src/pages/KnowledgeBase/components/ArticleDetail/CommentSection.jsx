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
    <section id="comments-section" className="mt-16 sm:mt-24 scroll-mt-32">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
          <div className="size-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white border border-blue-500 shadow-xl shadow-blue-600/20">
            <MessageCircle size={24} />
          </div>
          <div className="flex flex-col">
            <span>{t('common.comments')}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
              Join the discussion ({comments.length})
            </span>
          </div>
        </h3>
      </div>

      {/* Comment Form */}
      <div className="bg-white rounded-[40px] p-2 border border-slate-200 shadow-xl shadow-slate-200/40 relative group/form z-10">
        <div className="absolute top-0 right-0 size-64 bg-blue-500/5 blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover/form:bg-blue-500/10 transition-colors" />
        
        {replyTo && (
          <div className="m-4 mb-6 flex items-center justify-between bg-slate-900 text-white px-6 py-4 rounded-[28px] text-xs font-black uppercase tracking-widest shadow-2xl shadow-slate-950/20 animate-in slide-in-from-top-4 duration-500 relative z-20">
            <div className="flex items-center gap-4">
              <div className="size-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Reply size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] opacity-60">Replying to</span>
                <span>{replyTo.user.username}</span>
              </div>
            </div>
            <button 
              onClick={() => setReplyTo(null)} 
              className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all hover:scale-110"
            >
              <XIcon size={16} />
            </button>
          </div>
        )}
        
        <form onSubmit={handlePostComment} className="relative z-10 p-6 sm:p-8 pt-4">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => insertFormatting('inline')}
              className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-blue-600 transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border border-slate-100"
              title="Inline Code ( ` )"
            >
              <Code size={14} className="opacity-60" />
              Inline
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('block')}
              className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-blue-600 transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border border-slate-100"
              title="Script Block ( ``` )"
            >
              <Terminal size={14} className="opacity-60" />
              Script
            </button>
            <div className="w-px h-5 bg-slate-200 mx-2" />
            <div ref={emojiPickerRef} className="relative">
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border ${isEmojiPickerOpen ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-50 border-slate-100 text-slate-600 hover:text-blue-600 hover:bg-slate-100'}`}
                title="Emojis"
              >
                <Smile size={14} className={isEmojiPickerOpen ? 'opacity-100' : 'opacity-60'} />
                Emoji
              </button>
              
              {isEmojiPickerOpen && (
                <div className="absolute bottom-full mb-4 left-0 bg-white border border-slate-200 rounded-[32px] shadow-2xl p-5 z-[120] w-[300px] animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-5 gap-3">
                    {emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="size-10 flex items-center justify-center text-2xl hover:bg-slate-50 rounded-xl transition-all active:scale-90 hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Expression</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={user ? t('articles.write_comment') : t('articles.login_to_comment')}
              disabled={!user || submittingComment}
              className="w-full bg-slate-50/50 border border-slate-100 rounded-[32px] p-8 text-[16px] focus:ring-0 focus:border-blue-500/50 transition-all min-h-[180px] outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-inner placeholder:text-slate-300 resize-none"
            />
            <div className="absolute bottom-6 right-6 flex items-center gap-4">
              {commentText.length > 0 && (
                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{commentText.length} chars</span>
              )}
              <button
                type="submit"
                disabled={!user || !commentText.trim() || submittingComment}
                className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] flex items-center gap-3 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-600/30 group/btn"
              >
                {submittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />}
                {t('common.send')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="mt-16 sm:mt-24 space-y-12">
        {comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className="group animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="flex gap-6 sm:gap-8">
                <div className="hidden sm:flex flex-col items-center gap-3">
                  <div className="size-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-[28px] flex items-center justify-center text-slate-900 font-black text-xl border-4 border-white shadow-xl uppercase transition-transform group-hover:scale-110">
                    {comment.user.firstName?.charAt(0) || comment.user.username?.charAt(0)}
                  </div>
                  <div className="w-px h-full bg-slate-100 group-last:hidden" />
                </div>
                
                <div className="flex-1 min-w-0 space-y-5 pb-12 group-last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="sm:hidden size-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 font-black text-sm border border-slate-200 uppercase">
                        {comment.user.username.charAt(0)}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="font-black text-slate-900 text-lg leading-none">{comment.user.username}</span>
                        <div className="hidden sm:block size-1.5 bg-blue-500 rounded-full" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{format(new Date(comment.createdAt), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {user && (
                        <button 
                          onClick={() => {
                            setReplyTo(comment);
                            document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="size-10 bg-white hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center transition-all active:scale-90"
                          title={t('articles.reply')}
                        >
                          <Reply size={16} />
                        </button>
                      )}
                      {(user?.id === comment.userId || user?.role === 'SUPER_ADMIN') && (
                        <button 
                          onClick={() => handleDeleteComment(comment.id)} 
                          className="size-10 bg-white hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center transition-all active:scale-90"
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative group-hover:border-blue-100 group-hover:shadow-xl group-hover:shadow-blue-500/5 transition-all">
                    <CommentContent content={comment.content} />
                    <div className="absolute bottom-6 right-8 text-[24px] opacity-[0.03] select-none pointer-events-none font-black italic uppercase tracking-tighter">MIKROTIK USER</div>
                  </div>

                  {comment.replies?.length > 0 && (
                    <div className="mt-8 ml-4 sm:ml-12 space-y-8 pl-8 border-l-2 border-slate-100">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="group/reply space-y-4 relative">
                           {/* Reply Connector Dot */}
                          <div className="absolute -left-[35px] top-6 size-3 bg-white border-2 border-slate-200 rounded-full z-10" />
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="size-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 font-black text-sm border border-slate-200 uppercase shadow-sm">
                                {reply.user.username.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-slate-900 text-base leading-none">{reply.user.username}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{format(new Date(reply.createdAt), 'dd MMM yyyy')}</span>
                              </div>
                            </div>
                            {(user?.id === reply.userId || user?.role === 'SUPER_ADMIN') && (
                              <button 
                                onClick={() => handleDeleteComment(reply.id, true, comment.id)} 
                                className="size-8 bg-white hover:bg-rose-500 text-slate-300 hover:text-white rounded-lg border border-slate-100 flex items-center justify-center transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 group-hover/reply:border-blue-100 transition-all text-slate-600">
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
          <div className="text-center py-24 bg-slate-50/50 rounded-[64px] border-2 border-dashed border-slate-200 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="size-24 bg-white rounded-[32px] flex items-center justify-center text-slate-200 border border-slate-100 mx-auto mb-8 shadow-xl transition-transform group-hover:scale-110 group-hover:rotate-6">
                <MessageCircle size={48} />
              </div>
              <h4 className="text-lg font-black text-slate-400 uppercase tracking-[0.3em]">{t('articles.no_comments_yet')}</h4>
              <p className="text-slate-400/60 text-xs mt-2 uppercase font-bold tracking-widest">Be the first to share your thoughts</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CommentSection;
