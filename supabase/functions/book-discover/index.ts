import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, action, gutenberg_id } = await req.json();

    // Action: search — query Open Library + check Gutendex availability
    if (action === "search" && query) {
      // Search Open Library
      const olRes = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,cover_i,first_publish_year,subject,isbn,language,edition_count`
      );
      const olData = await olRes.json();
      const docs = olData.docs || [];

      // Batch check Gutendex for free availability
      const gutRes = await fetch(
        `https://gutendex.com/books/?search=${encodeURIComponent(query)}`
      );
      const gutData = await gutRes.json();
      const gutBooks = gutData.results || [];

      // Build a set of Gutenberg titles (lowercased) for matching
      const gutMap = new Map<string, any>();
      for (const gb of gutBooks) {
        gutMap.set(gb.title.toLowerCase().trim(), gb);
        // Also index by first author's name + partial title
        if (gb.authors?.[0]) {
          const authorKey = `${gb.authors[0].name.toLowerCase()}::${gb.title.toLowerCase().substring(0, 20)}`;
          gutMap.set(authorKey, gb);
        }
      }

      const results = docs.map((doc: any) => {
        const title = doc.title || "";
        const author = doc.author_name?.[0] || "Unknown";
        const titleLower = title.toLowerCase().trim();

        // Try to find a Gutenberg match
        let gutMatch = gutMap.get(titleLower);
        if (!gutMatch) {
          // Try author+partial title match
          const authorKey = `${author.toLowerCase()}::${titleLower.substring(0, 20)}`;
          gutMatch = gutMap.get(authorKey);
        }
        if (!gutMatch) {
          // Fuzzy: check if any Gutenberg title contains this title or vice versa
          for (const [key, val] of gutMap.entries()) {
            if (!key.includes("::") && (key.includes(titleLower) || titleLower.includes(key))) {
              gutMatch = val;
              break;
            }
          }
        }

        let epubUrl = null;
        let gutenbergId = null;
        if (gutMatch) {
          gutenbergId = gutMatch.id;
          // Find EPUB format
          const formats = gutMatch.formats || {};
          epubUrl =
            formats["application/epub+zip"] ||
            formats["application/epub"] ||
            null;
        }

        return {
          key: doc.key,
          title,
          author,
          cover_i: doc.cover_i || null,
          first_publish_year: doc.first_publish_year || null,
          subjects: doc.subject?.slice(0, 5) || [],
          isbn: doc.isbn?.[0] || null,
          languages: doc.language || [],
          status: gutMatch ? "FREE" : "INFO_ONLY",
          gutenberg_id: gutenbergId,
          epub_url: epubUrl,
        };
      });

      // Sort free books first
      results.sort((a: any, b: any) => {
        if (a.status === "FREE" && b.status !== "FREE") return -1;
        if (a.status !== "FREE" && b.status === "FREE") return 1;
        return 0;
      });

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: get_epub — get EPUB download URL from Gutendex by ID
    if (action === "get_epub" && gutenberg_id) {
      const res = await fetch(`https://gutendex.com/books/${gutenberg_id}/`);
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Book not found on Gutenberg" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const book = await res.json();
      const formats = book.formats || {};
      const epubUrl =
        formats["application/epub+zip"] ||
        formats["application/epub"] ||
        null;

      // Also get text content for the reader
      const textUrl =
        formats["text/plain; charset=utf-8"] ||
        formats["text/plain; charset=us-ascii"] ||
        formats["text/plain"] ||
        null;

      let textContent: string[] | null = null;
      if (textUrl) {
        try {
          const textRes = await fetch(textUrl);
          const fullText = await textRes.text();
          // Split into pages (~1500 chars each)
          const pageSize = 1500;
          const pages: string[] = [];
          for (let i = 0; i < fullText.length; i += pageSize) {
            pages.push(fullText.substring(i, i + pageSize));
          }
          textContent = pages;
        } catch {
          // Ignore text fetch errors
        }
      }

      return new Response(
        JSON.stringify({
          epub_url: epubUrl,
          text_content: textContent,
          title: book.title,
          authors: book.authors?.map((a: any) => a.name) || [],
          subjects: book.subjects?.slice(0, 5) || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: trending — get popular/trending books from Gutendex
    if (action === "trending") {
      const res = await fetch("https://gutendex.com/books/?sort=popular&page=1");
      const data = await res.json();
      const trending = (data.results || []).slice(0, 12).map((b: any) => {
        const formats = b.formats || {};
        return {
          gutenberg_id: b.id,
          title: b.title,
          author: b.authors?.[0]?.name || "Unknown",
          cover_url: formats["image/jpeg"] || null,
          subjects: b.subjects?.slice(0, 3) || [],
          download_count: b.download_count || 0,
          epub_url: formats["application/epub+zip"] || formats["application/epub"] || null,
          status: "FREE",
        };
      });
      return new Response(JSON.stringify({ trending }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
