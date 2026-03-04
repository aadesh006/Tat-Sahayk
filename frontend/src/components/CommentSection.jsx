import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComments, postComment, deleteComment } from "../lib/api.js";
import useAuthUser from "../hooks/useAuthUser.js";
import { useTranslation } from "react-i18next";
import { Loader2, Send, Trash2 } from "lucide-react";

const CommentSection = ({ reportId }) => {
  const { t } = useTranslation();
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", reportId],
    queryFn: () => fetchComments(reportId),
  });

  const { mutate: submit, isPending: posting } = useMutation({
    mutationFn: () => postComment({ reportId, content: text }),
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["comments", reportId] });
    },
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: (commentId) => deleteComment({ reportId, commentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", reportId] }),
  });

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Loader2 size={16} className="animate-spin text-slate-400" />
      ) : comments?.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 group">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {c.author_name?.charAt(0) || "?"}
              </div>
              <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-2">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{c.author_name}</p>
                <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">{c.content}</p>
                <p className="text-[9px] text-slate-400 mt-1">
                  {new Date(c.created_at).toLocaleString("en-IN")}
                </p>
              </div>
              {(authUser?.id === c.user_id || authUser?.role === "admin") && (
                <button
                  onClick={() => doDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">{t("noComments")}</p>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {authUser?.full_name?.charAt(0) || "?"}
        </div>
        <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) submit(); }}
            placeholder={t("addComment")}
            className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={() => text.trim() && submit()}
            disabled={posting || !text.trim()}
            className="text-blue-600 dark:text-blue-400 disabled:opacity-30"
          >
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentSection;