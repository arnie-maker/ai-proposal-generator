"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { DEFAULT_PROMPT_TEMPLATE } from "@/lib/constants";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PromptEditor({ value, onChange }: PromptEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <GlassCard hover className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-sm cursor-pointer"
      >
        <div className="flex items-center gap-2 text-text-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.376 3.622a1 1 0 013.002 3.002L7.368 18.635a2 2 0 01-.855.506l-2.872.838a.5.5 0 01-.62-.62l.838-2.872a2 2 0 01.506-.855z" />
          </svg>
          <span className="font-medium">프롬프트 편집</span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-text-tertiary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-text-tertiary">
            {"{{URL_CONTENT}}"} 부분에 스크래핑된 웹사이트 내용이 자동 삽입됩니다
          </p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={10}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-blue/40 focus:ring-1 focus:ring-accent-blue/20 transition-all duration-200 resize-y font-mono"
          />
          <button
            onClick={() => onChange(DEFAULT_PROMPT_TEMPLATE)}
            className="text-xs text-text-secondary hover:text-accent-blue transition-colors cursor-pointer"
          >
            기본값 복원
          </button>
        </div>
      )}
    </GlassCard>
  );
}
