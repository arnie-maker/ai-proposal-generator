"use client";

import { useState, useCallback } from "react";
import GlassCard from "@/components/ui/GlassCard";
import PromptEditor from "@/components/PromptEditor";
import ProposalOutput from "@/components/ProposalOutput";
import Spinner from "@/components/ui/Spinner";
import { DEFAULT_PROMPT_TEMPLATE } from "@/lib/constants";

export default function UrlInputForm() {
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT_TEMPLATE);
  const [output, setOutput] = useState("");
  const [urlContent, setUrlContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "scraping" | "generating">("idle");
  const [lang, setLang] = useState<"en" | "ko">("en");

  const handleGenerate = useCallback(async () => {
    if (!url.trim()) return;

    setError("");
    setOutput("");
    setUrlContent("");
    setIsSaved(false);
    setIsLoading(true);
    setStep("scraping");

    try {
      // Step 1: Scrape URL
      const fetchRes = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!fetchRes.ok) {
        const data = await fetchRes.json();
        throw new Error(data.error || "URL 스크래핑에 실패했습니다");
      }

      const { content: scraped } = await fetchRes.json();
      setUrlContent(scraped);

      // Step 2: Generate proposal
      setStep("generating");
      setIsStreaming(true);

      const langInstruction = lang === "ko"
        ? "IMPORTANT: Write the entire proposal in Korean (한국어)."
        : "Write the proposal in English.";
      const finalPrompt = prompt.replace("{{LANGUAGE_INSTRUCTION}}", langInstruction);

      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlContent: scraped, prompt: finalPrompt }),
      });

      if (!genRes.ok) {
        const data = await genRes.json();
        throw new Error(data.error || "제안서 생성에 실패했습니다");
      }

      // Read SSE stream
      const reader = genRes.body?.getReader();
      if (!reader) throw new Error("Stream not available");

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              accumulated += content;
              setOutput(accumulated);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStep("idle");
    }
  }, [url, prompt, lang]);

  const handleSave = useCallback(async () => {
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url.trim(),
        urlContent,
        promptUsed: prompt,
        generatedContent: output,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "저장에 실패했습니다");
    }

    setIsSaved(true);
  }, [url, urlContent, prompt, output]);

  return (
    <div className="space-y-6">
      <GlassCard hover className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-text-secondary font-medium">URL 입력</label>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${lang === "en" ? "text-text-primary" : "text-text-tertiary"}`}>EN</span>
              <button
                type="button"
                onClick={() => setLang(lang === "en" ? "ko" : "en")}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                  lang === "ko" ? "bg-accent-blue" : "bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    lang === "ko" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-xs font-medium ${lang === "ko" ? "text-text-primary" : "text-text-tertiary"}`}>한국어</span>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={isLoading}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-blue/40 focus:ring-1 focus:ring-accent-blue/20 transition-all duration-200 disabled:opacity-50"
            />
            <button
              onClick={handleGenerate}
              disabled={isLoading || !url.trim()}
              className="btn-gradient text-sm font-medium px-6 rounded-xl flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  {step === "scraping" ? "분석 중..." : "생성 중..."}
                </>
              ) : (
                "생성하기"
              )}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3 border border-red-400/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </GlassCard>

      <PromptEditor value={prompt} onChange={setPrompt} />

      <ProposalOutput
        content={output}
        isStreaming={isStreaming}
        onSave={handleSave}
        isSaved={isSaved}
      />
    </div>
  );
}
