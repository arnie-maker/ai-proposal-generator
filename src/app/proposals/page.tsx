"use client";

import { useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import ProposalCard from "@/components/ProposalCard";
import Spinner from "@/components/ui/Spinner";

interface ProposalListItem {
  id: string;
  url: string;
  generated_content: string;
  created_at: string;
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/proposals")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch proposals");
        return res.json();
      })
      .then(setProposals)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">
          <span className="gradient-text">제안서</span> 히스토리
        </h2>
        <p className="text-text-secondary text-sm">
          이전에 생성한 제안서를 확인할 수 있습니다
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="scale-150" />
        </div>
      ) : error ? (
        <GlassCard className="p-6">
          <div className="text-center text-red-400 text-sm">
            <p>{error}</p>
            <p className="text-text-tertiary mt-2 text-xs">
              Supabase 연결 설정을 확인해주세요
            </p>
          </div>
        </GlassCard>
      ) : proposals.length === 0 ? (
        <GlassCard className="p-12 flex items-center justify-center">
          <div className="text-center text-text-tertiary">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p className="text-sm">아직 저장된 제안서가 없습니다</p>
            <p className="text-xs mt-1">제안서를 생성하고 저장해보세요</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              id={p.id}
              url={p.url}
              generatedContent={p.generated_content}
              createdAt={p.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
