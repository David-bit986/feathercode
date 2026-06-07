import type { Artifact } from "../store/artifactsStore";

type Props = {
  artifact: Artifact;
};

export function ArtifactRenderer({ artifact }: Props) {
  switch (artifact.content.type) {
    case "code-diff":
      return <CodeDiffView content={artifact.content} />;
    case "architecture-diagram":
      return <MermaidView content={artifact.content} />;
    case "task-report":
      return <MarkdownView markdown={artifact.content.markdown} />;
    case "test-results":
      return <TestResultsView content={artifact.content} />;
    case "api-spec":
      return <ApiSpecView content={artifact.content} />;
    case "data-schema":
      return <DataSchemaView content={artifact.content} />;
    case "documentation":
      return <MarkdownView markdown={artifact.content.markdown} />;
    default:
      return <PlainView content={artifact.content} />;
  }
}

function CodeDiffView({
  content,
}: { content: { type: "code-diff"; fileName: string; hunks: string } }) {
  return (
    <div>
      <p className="text-xs font-mono text-muted-foreground mb-2">
        File: {content.fileName}
      </p>
      <pre className="p-3 text-xs font-mono overflow-x-auto rounded bg-muted">
        <code>{content.hunks}</code>
      </pre>
    </div>
  );
}

function MermaidView({
  content,
}: { content: { type: "architecture-diagram"; mermaidSource: string; format: "mermaid" } }) {
  return (
    <div>
      <pre className="p-3 text-xs font-mono overflow-x-auto rounded bg-muted mb-2">
        <code>{content.mermaidSource}</code>
      </pre>
      <div className="flex justify-center p-4 border rounded">
        <div className="mermaid">{content.mermaidSource}</div>
      </div>
    </div>
  );
}

function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="p-3 prose prose-sm dark:prose-invert max-w-none">
      <pre className="text-sm whitespace-pre-wrap font-sans">{markdown}</pre>
    </div>
  );
}

function TestResultsView({
  content,
}: { content: { type: "test-results"; passed: number; failed: number; skipped: number; output: string } }) {
  const total = content.passed + content.failed + content.skipped;

  return (
    <div>
      <div className="flex gap-4 mb-3">
        <ResultPill label="Passed" count={content.passed} color="green" />
        <ResultPill label="Failed" count={content.failed} color="red" />
        <ResultPill label="Skipped" count={content.skipped} color="yellow" />
        <ResultPill label="Total" count={total} color="gray" />
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto rounded bg-muted">
        <code>{content.output}</code>
      </pre>
    </div>
  );
}

function ResultPill({
  label,
  count,
  color,
}: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    green: "bg-primary/10 text-primary",
    red: "bg-destructive/10 text-destructive",
    yellow: "bg-muted text-muted-foreground",
    gray: "bg-muted text-muted-foreground",
  };

  return (
    <div
      className={`px-3 py-1.5 rounded text-center ${colorMap[color] ?? colorMap.gray}`}
    >
      <p className="text-xs font-medium">{label}</p>
      <p className="text-lg font-bold">{count}</p>
    </div>
  );
}

function ApiSpecView({
  content,
}: { content: { type: "api-spec"; spec: string; format: "openapi" | "graphql" } }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Format: {content.format.toUpperCase()}
      </p>
      <pre className="p-3 text-xs font-mono overflow-x-auto rounded bg-muted">
        <code>{content.spec}</code>
      </pre>
    </div>
  );
}

function DataSchemaView({
  content,
}: { content: { type: "data-schema"; schema: string; format: "prisma" | "sql" } }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Format: {content.format.toUpperCase()}
      </p>
      <pre className="p-3 text-xs font-mono overflow-x-auto rounded bg-muted">
        <code>{content.schema}</code>
      </pre>
    </div>
  );
}

function PlainView({
  content,
}: { content: { mimeType: string; data: string } }) {
  return (
    <pre className="p-3 text-xs font-mono overflow-x-auto rounded bg-muted">
      <code>{content.data}</code>
    </pre>
  );
}
