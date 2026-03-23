import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("proposals")
    .select("id, url, generated_content, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { url, urlContent, promptUsed, generatedContent } = body;

  if (!url || !generatedContent) {
    return NextResponse.json({ error: "url and generatedContent are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      url,
      url_content: urlContent || null,
      prompt_used: promptUsed,
      generated_content: generatedContent,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
