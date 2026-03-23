import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";

interface ProposalCardProps {
  id: string;
  url: string;
  generatedContent: string;
  createdAt: string;
}

export default function ProposalCard({ id, url, generatedContent, createdAt }: ProposalCardProps) {
  const preview = generatedContent.slice(0, 150).replace(/[#*_`]/g, "") + "...";
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();
  const date = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link href={`/proposals/${id}`}>
      <GlassCard hover className="p-5 h-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-accent-blue truncate max-w-[200px]">{domain}</span>
          <span className="text-xs text-text-tertiary shrink-0">{date}</span>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed flex-1">{preview}</p>
        <div className="flex items-center gap-1 text-xs text-text-tertiary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          자세히 보기
        </div>
      </GlassCard>
    </Link>
  );
}
