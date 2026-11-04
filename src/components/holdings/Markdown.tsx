import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders memo markdown with the site's type scale. Links open in a new tab. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-relaxed text-ink-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => (
            <h2
              className="mt-10 mb-3 text-[22px] font-semibold tracking-tight text-ink first:mt-0"
              {...p}
            />
          ),
          h2: (p) => (
            <h2
              className="mt-10 mb-3 text-[20px] font-semibold tracking-tight text-ink first:mt-0"
              {...p}
            />
          ),
          h3: (p) => <h3 className="mt-6 mb-2 text-[16px] font-semibold text-ink" {...p} />,
          p: (p) => <p className="my-3" {...p} />,
          ul: (p) => <ul className="my-3 list-disc space-y-1.5 pl-5" {...p} />,
          ol: (p) => <ol className="my-3 list-decimal space-y-1.5 pl-5" {...p} />,
          strong: (p) => <strong className="font-semibold text-ink" {...p} />,
          a: (p) => (
            <a
              className="underline underline-offset-2 hover:text-ink"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
          blockquote: (p) => (
            <blockquote className="my-4 border-l-2 border-ink pl-4 text-ink-3" {...p} />
          ),
          table: (p) => (
            <div className="my-4 overflow-x-auto">
              <table className="tabular w-full text-[14px]" {...p} />
            </div>
          ),
          th: (p) => (
            <th className="border-b border-line px-3 py-2 text-left font-medium text-ink" {...p} />
          ),
          td: (p) => <td className="border-b border-line/70 px-3 py-2" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
