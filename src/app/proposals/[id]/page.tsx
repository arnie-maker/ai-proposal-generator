"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import GlassCard from "@/components/ui/GlassCard";
import Spinner from "@/components/ui/Spinner";
import type { Proposal } from "@/types";

export default function ProposalDetailPage() {
  const params = useParams();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/proposals/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setProposal)
      .catch(() => setProposal(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleCopy = async () => {
    if (!proposal) return;
    await navigator.clipboard.writeText(proposal.generated_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="scale-150" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="max-w-4xl mx-auto">
        <GlassCard className="p-12 text-center">
          <p className="text-text-secondary">제안서를 찾을 수 없습니다</p>
          <Link href="/proposals" className="text-accent-blue text-sm mt-2 inline-block hover:underline">
            히스토리로 돌아가기
          </Link>
        </GlassCard>
      </div>
    );
  }

  const date = new Date(proposal.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/proposals"
          className="text-text-secondary hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-white/[0.05]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">제안서 상세</h2>
          <p className="text-text-secondary text-sm">{date}</p>
        </div>
      </div>

      {/* Metadata */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary">URL:</span>
          <a
            href={proposal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline truncate"
          >
            {proposal.url}
          </a>
        </div>
      </GlassCard>

      {/* Prompt (collapsible) */}
      <GlassCard className="overflow-hidden">
        <button
          onClick={() => setShowPrompt(!showPrompt)}
          className="w-full flex items-center justify-between p-4 text-sm cursor-pointer"
        >
          <span className="text-text-secondary font-medium">사용된 프롬프트</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-text-tertiary transition-transform ${showPrompt ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showPrompt && (
          <div className="px-4 pb-4">
            <pre className="text-xs text-text-tertiary whitespace-pre-wrap font-mono bg-white/[0.02] rounded-lg p-3">
              {proposal.prompt_used}
            </pre>
          </div>
        )}
      </GlassCard>

      {/* Proposal content */}
      <GlassCard className="p-6 relative">
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer"
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          )}
        </button>
        <div className="prose prose-invert prose-sm max-w-none pr-12
          prose-headings:text-text-primary prose-p:text-text-secondary prose-strong:text-text-primary
          prose-li:text-text-secondary prose-a:text-accent-blue">
          <Markdown remarkPlugins={[remarkGfm]}>{proposal.generated_content}</Markdown>
        </div>
      </GlassCard>
    </div>
  );
}
