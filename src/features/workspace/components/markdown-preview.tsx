"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
    title?: string;
    content: string;
    compact?: boolean;
}

function extractEmbeddableHtml(content: string): { markdown: string; embeds: string[] } {
    const embeds: string[] = [];
    let markdown = content;

    const fencedHtmlRegex = /```html\s*([\s\S]*?)```/gi;
    markdown = markdown.replace(fencedHtmlRegex, (_, block: string) => {
        const normalized = block.trim();
        if (/<canvas[\s>]/i.test(normalized) || /chart\.js/i.test(normalized)) {
            embeds.push(normalized);
            return "\n\n";
        }
        return _;
    });

    const rawChartRegex = /(<div[^>]*>[\s\S]*?<canvas[\s\S]*?<\/script>)/i;
    const rawMatch = markdown.match(rawChartRegex);
    if (rawMatch?.[1]) {
        embeds.push(rawMatch[1].trim());
        markdown = markdown.replace(rawMatch[1], "\n\n");
    }

    return { markdown, embeds };
}

export function MarkdownPreview({
    title = "Bản tóm tắt AI",
    content,
    compact = false,
}: MarkdownPreviewProps) {
    const parsed = extractEmbeddableHtml(content);

    return (
        <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${compact ? "h-full" : ""}`}>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Trình bày Markdown
                </span>
            </div>
            <div
                className={`prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-emerald-700 ${compact ? "max-h-[52vh] overflow-y-auto pr-1" : ""}`}
            >
                {parsed.embeds.map((embed, index) => (
                    <div key={`embed-${index}`} className="mb-4 rounded-xl border border-slate-200">
                        <iframe
                            title={`summary-embed-${index + 1}`}
                            sandbox="allow-scripts allow-same-origin"
                            srcDoc={embed}
                            className="h-[340px] w-full rounded-xl"
                        />
                    </div>
                ))}
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.markdown}</ReactMarkdown>
            </div>
        </section>
    );
}
