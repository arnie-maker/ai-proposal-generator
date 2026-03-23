import * as cheerio from "cheerio";

const MAX_CONTENT_LENGTH = 8000;

export async function scrapeUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove non-content elements
  $("script, style, nav, footer, header, iframe, noscript, svg, img, video, audio").remove();
  $("[role='navigation'], [role='banner'], [role='contentinfo']").remove();

  const title = $("title").text().trim() || $("h1").first().text().trim() || "";
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  // Extract text content
  let content = $("main, article, [role='main']").text().trim();
  if (!content || content.length < 100) {
    content = $("body").text().trim();
  }

  // Clean up whitespace
  content = content
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Truncate
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.slice(0, MAX_CONTENT_LENGTH) + "...";
  }

  return { title, description, content };
}
