import { callOpenRouter } from "@/lib/openrouter";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { urlContent, prompt } = await request.json();

    if (!urlContent || !prompt) {
      return new Response(JSON.stringify({ error: "urlContent and prompt are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const finalPrompt = prompt.replace("{{URL_CONTENT}}", urlContent);
    const openRouterResponse = await callOpenRouter(finalPrompt);

    // Pipe the SSE stream directly to the client
    return new Response(openRouterResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
