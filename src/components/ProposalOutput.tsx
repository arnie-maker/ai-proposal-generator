"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import GlassCard from "@/components/ui/GlassCard";

interface ProposalOutputProps {
  content: string;
  isStreaming: boolean;
  onSave?: () => Promise<void>;
  isSaved?: boolean;
}

export default function ProposalOutput({ content, isStreaming, onSave, isSaved }: ProposalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  if (!content && !isStreaming) {
    return (
      <GlassCard className="p-6 min-h-[300px] flex items-center justify-center">
        <div className="text-center text-text-tertiary">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm">생성된 제안서가 여기에 표시됩니다</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {content && !isStreaming && onSave && (
          <button
            onClick={handleSave}
            disabled={saving || isSaved}
            className={`text-sm px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              isSaved
                ? "text-green-400 bg-green-400/10 border border-green-400/20"
                : "text-text-secondary hover:text-text-primary hover:bg-white/[0.05] border border-white/[0.06]"
            }`}
          >
            {isSaved ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                저장됨
              </>
            ) : saving ? (
              "저장 중..."
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                저장
              </>
            )}
          </button>
        )}
        {content && (
          <button
            onClick={handleCopy}
            className="text-text-secondary hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer"
            title="복사"
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        className="max-h-[600px] overflow-y-auto prose prose-invert prose-sm max-w-none pr-20
          prose-headings:text-text-primary prose-p:text-text-secondary prose-strong:text-text-primary
          prose-li:text-text-secondary prose-a:text-accent-blue"
      >
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
      {isStreaming && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
          <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
          <span className="text-xs text-text-secondary">생성 중...</span>
        </div>
      )}
    </GlassCard>
  );
}
