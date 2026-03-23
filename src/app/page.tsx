import UrlInputForm from "@/components/UrlInputForm";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">
          <span className="gradient-text">AI 제안서</span> 생성기
        </h2>
        <p className="text-text-secondary text-sm">
          URL을 입력하면 웹사이트 내용을 분석하여 제안서를 자동 생성합니다
        </p>
      </div>

      <UrlInputForm />
    </div>
  );
}
