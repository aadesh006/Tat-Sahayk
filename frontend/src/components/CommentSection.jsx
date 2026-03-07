import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComments, postComment, deleteComment } from "../lib/api.js";
import useAuthUser from "../hooks/useAuthUser.js";
import { useTranslation } from "react-i18next";
import { Loader2, Send, Trash2, Reply, X } from "lucide-react";

const CommentSection = ({ reportId }) => {
  const { t } = useTranslation();
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", reportId],
    queryFn: () => fetchComments(reportId),
  });

  const { mutate: submit, isPending: posting } = useMutation({
    mutationFn: () => postComment({ reportId, content: text }),
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["comments", reportId] });
    },
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: (commentId) => deleteComment({ reportId, commentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", reportId] }),
  });

  const handleReply = (comment) => {
    setReplyTo(comment);
    setText(`@${comment.author_name} `);
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : comments?.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3 group">
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
                <div className="bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-2xl px-4 py-2.5 border border-gray-100 dark:border-[rgb(47,51,54)]">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{c.author_name}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed break-words">{c.content}</p>
                </div>
                
                <div className="flex items-center gap-3 mt-1.5 px-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {new Date(c.created_at).toLocaleString("en-IN", { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  <button
                    onClick={() => handleReply(c)}
                    className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors flex items-center gap-1"
                  >
                    <Reply size={10} /> Reply
                  </button>
                  {(authUser?.id === c.user_id || authUser?.role === "admin") && (
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
          ))}
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
              onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) submit(); }}
              placeholder={replyTo ? `Reply to ${replyTo.author_name}...` : t("addComment")}
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none placeholder:text-gray-400"
            />
            <button
              onClick={() => text.trim() && submit()}
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