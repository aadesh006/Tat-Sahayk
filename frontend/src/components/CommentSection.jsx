import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComments, postComment, deleteComment } from "../lib/api.js";
import useAuthUser from "../hooks/useAuthUser.js";
import { useTranslation } from "react-i18next";
import { Loader2, Send, Trash2, Reply, X, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";

const CommentSection = ({ reportId }) => {
  const { t } = useTranslation();
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [expandedComments, setExpandedComments] = useState(new Set());

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", reportId],
    queryFn: () => fetchComments(reportId),
  });

  const { mutate: submit, isPending: posting } = useMutation({
    mutationFn: ({ content, parent_id }) => postComment({ 
      reportId, 
      content,
      parent_id
    }),
    onMutate: async ({ content, parent_id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["comments", reportId] });
      
      // Snapshot previous value
      const previousComments = queryClient.getQueryData(["comments", reportId]);
      
      // Optimistically update with new comment
      const optimisticComment = {
        id: `temp-${Date.now()}`, // Temporary ID
        report_id: reportId,
        user_id: authUser.id,
        parent_id: parent_id,
        content: content,
        created_at: new Date().toISOString(),
        author_name: authUser.full_name,
        author_profile_photo: authUser.profile_photo,
        author_role: authUser.role,
        isOptimistic: true
      };
      
      queryClient.setQueryData(["comments", reportId], (old) => 
        old ? [...old, optimisticComment] : [optimisticComment]
      );
      
      // Clear input immediately
      setText("");
      setReplyTo(null);
      
      return { previousComments, optimisticComment };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(["comments", reportId], context.previousComments);
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic comment with real one
      queryClient.setQueryData(["comments", reportId], (old) => {
        if (!old) return [data];
        // Remove all temp comments and add the real one
        const withoutTemp = old.filter(c => !c.isOptimistic);
        return [...withoutTemp, data];
      });
    },
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: (commentId) => deleteComment({ reportId, commentId }),
    onMutate: async (commentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["comments", reportId] });
      
      // Snapshot previous value
      const previousComments = queryClient.getQueryData(["comments", reportId]);
      
      // Optimistically remove comment and its replies
      queryClient.setQueryData(["comments", reportId], (old) =>
        old ? old.filter(c => c.id !== commentId && c.parent_id !== commentId) : []
      );
      
      return { previousComments };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(["comments", reportId], context.previousComments);
    },
  });

  const handleReply = (comment) => {
    setReplyTo(comment);
    // Don't pre-fill with @mention - just set reply context
  };

  const toggleReplies = (commentId) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Separate parent comments and replies
  const parentComments = comments?.filter(c => !c.parent_id) || [];
  const getReplies = (parentId) => comments?.filter(c => c.parent_id === parentId) || [];

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : parentComments.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {parentComments.map((c) => {
            const replies = getReplies(c.id);
            const isExpanded = expandedComments.has(c.id);
            
            return (
              <div key={c.id}>
                {/* Parent Comment */}
                <div className="flex items-start gap-3 group">
                  {/* Profile Photo */}
                  {c.author_profile_photo ? (
                    <img 
                      src={c.author_profile_photo} 
                      alt={c.author_name}
                      className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-[rgb(47,51,54)] shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {c.author_name?.charAt(0) || "?"}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{c.author_name}</p>
                      {c.author_role === 'admin' && (
                        <div className="flex items-center">
                          <ShieldCheck size={15} className="text-blue-500 fill-blue-500" title="Verified Admin" />
                        </div>
                      )}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                        {new Date(c.created_at).toLocaleString("en-IN", { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words mb-2">{c.content}</p>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleReply(c)}
                        className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors flex items-center gap-1"
                      >
                        <Reply size={10} /> Reply
                      </button>
                      
                      {replies.length > 0 && (
                        <button
                          onClick={() => toggleReplies(c.id)}
                          className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                      )}
                      
                      {authUser?.id === c.user_id && (
                        <button
                          onClick={() => doDelete(c.id)}
                          className="text-[10px] font-semibold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={10} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies (collapsible) */}
                {isExpanded && replies.length > 0 && (
                  <div className="ml-11 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-[rgb(47,51,54)] pl-3">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex items-start gap-3 group">
                        {/* Reply Profile Photo */}
                        {reply.author_profile_photo ? (
                          <img 
                            src={reply.author_profile_photo} 
                            alt={reply.author_name}
                            className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-[rgb(47,51,54)] shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {reply.author_name?.charAt(0) || "?"}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">{reply.author_name}</p>
                            {reply.author_role === 'admin' && (
                              <div className="flex items-center">
                                <ShieldCheck size={14} className="text-blue-500 fill-blue-500" title="Verified Admin" />
                              </div>
                            )}
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                              {new Date(reply.created_at).toLocaleString("en-IN", { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words mb-1">{reply.content}</p>
                          
                          {authUser?.id === reply.user_id && (
                            <button
                              onClick={() => doDelete(reply.id)}
                              className="text-[10px] font-semibold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={10} /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">{t("noComments")}</p>
      )}

      {/* Input */}
      <div className="flex items-start gap-3 pt-2 border-t border-gray-100 dark:border-[rgb(47,51,54)]">
        {authUser?.profile_photo ? (
          <img 
            src={authUser.profile_photo} 
            alt={authUser.full_name}
            className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-[rgb(47,51,54)] shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {authUser?.full_name?.charAt(0) || "?"}
          </div>
        )}
        
        <div className="flex-1">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-lg text-xs">
              <Reply size={12} className="text-sky-500" />
              <span className="text-gray-600 dark:text-gray-400">Replying to <span className="font-semibold text-sky-600 dark:text-sky-400">{replyTo.author_name}</span></span>
              <button onClick={() => { setReplyTo(null); setText(""); }} className="ml-auto text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-[rgb(38,38,38)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-full px-4 py-2.5">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) submit({ content: text, parent_id: replyTo?.id || null }); }}
              placeholder={replyTo ? `Reply to ${replyTo.author_name}...` : t("addComment")}
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none placeholder:text-gray-400"
            />
            <button
              onClick={() => text.trim() && submit({ content: text, parent_id: replyTo?.id || null })}
              disabled={posting || !text.trim()}
              className="text-sky-500 dark:text-sky-400 disabled:opacity-30 hover:scale-110 transition-transform"
            >
              {posting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentSection;