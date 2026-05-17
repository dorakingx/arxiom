"use client";

import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  "c#": "csharp",
  js: "javascript",
  ts: "typescript",
  py: "python",
  rs: "rust",
  sh: "bash",
};

function normalizeLanguage(lang: string): string {
  const key = lang.toLowerCase();
  return LANGUAGE_ALIASES[key] ?? key;
}

const highlighterStyle = {
  margin: "0",
  borderRadius: "0.5rem",
  border: "1px solid rgb(63 63 70 / 0.9)",
  background: "rgb(9 9 11) !important",
  fontSize: "0.8125rem",
  lineHeight: "1.55",
} as const;

function CodeBlock({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"code">) {
  const text = String(children).replace(/\n$/, "");
  const match = /language-([\w+#-]+)/i.exec(className ?? "");
  const language = match?.[1] ?? (text.includes("\n") ? "text" : null);

  if (language) {
    return (
      <SyntaxHighlighter
        language={normalizeLanguage(language)}
        style={vscDarkPlus}
        PreTag="div"
        customStyle={highlighterStyle}
        codeTagProps={{
          style: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
        }}
        showLineNumbers={text.split("\n").length > 4}
        lineNumberStyle={{
          minWidth: "2.25em",
          paddingRight: "0.75em",
          color: "rgb(113 113 122)",
          userSelect: "none",
        }}
      >
        {text}
      </SyntaxHighlighter>
    );
  }

  return (
    <code
      className="rounded-md border border-zinc-700/60 bg-zinc-800/90 px-1.5 py-0.5 font-mono text-[0.8rem] text-indigo-200"
      {...props}
    >
      {children}
    </code>
  );
}

const markdownComponents: Components = {
  pre({ children }) {
    return <div className="my-3 overflow-hidden rounded-lg">{children}</div>;
  },
  code(props) {
    return <CodeBlock {...props} />;
  },
  h1({ children }) {
    return (
      <h3 className="mt-5 border-b border-zinc-800 pb-2 text-lg font-semibold tracking-tight text-white first:mt-0">
        {children}
      </h3>
    );
  },
  h2({ children }) {
    return (
      <h3 className="mt-5 border-b border-zinc-800 pb-2 text-base font-semibold text-white first:mt-0">
        {children}
      </h3>
    );
  },
  h3({ children }) {
    return (
      <h4 className="mt-4 text-sm font-semibold text-indigo-200 first:mt-0">{children}</h4>
    );
  },
  h4({ children }) {
    return <h5 className="mt-3 text-sm font-medium text-zinc-200">{children}</h5>;
  },
  p({ children }) {
    return <p className="mt-2 text-sm leading-relaxed text-zinc-300">{children}</p>;
  },
  ul({ children }) {
    return (
      <ul className="my-2 list-disc space-y-1.5 pl-5 text-sm text-zinc-300 marker:text-indigo-400/80">
        {children}
      </ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="my-2 list-decimal space-y-1.5 pl-5 text-sm text-zinc-300 marker:text-indigo-400/80">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-3 border-l-2 border-indigo-500/50 bg-indigo-500/5 py-2 pl-4 text-sm italic text-zinc-400">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-5 border-zinc-800" />;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-300 underline decoration-indigo-500/40 underline-offset-2 transition hover:text-indigo-200"
      >
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto rounded-lg border border-zinc-700/80 ring-1 ring-white/5">
        <table className="w-full min-w-[280px] border-collapse text-left text-xs">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-zinc-800/90 text-zinc-100">{children}</thead>;
  },
  tbody({ children }) {
    return <tbody className="divide-y divide-zinc-800/90">{children}</tbody>;
  },
  tr({ children }) {
    return <tr className="bg-zinc-900/40 even:bg-zinc-900/20">{children}</tr>;
  },
  th({ children }) {
    return <th className="px-3 py-2.5 font-semibold text-zinc-200">{children}</th>;
  },
  td({ children }) {
    return <td className="px-3 py-2.5 text-zinc-400">{children}</td>;
  },
  strong({ children }) {
    return <strong className="font-semibold text-zinc-100">{children}</strong>;
  },
  em({ children }) {
    return <em className="text-zinc-400">{children}</em>;
  },
};

export function SolutionMarkdown({ content }: { content: string }) {
  return (
    <div className="solution-markdown max-w-none text-zinc-300 [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
