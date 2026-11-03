// An operator page's Markdown (#48): rendered with GitHub's extensions (tables, autolinks), never raw HTML.
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function OperatorMarkdown({ text }: { text: string }) {
  return (
    <div className="operator-text">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml>
        {text}
      </Markdown>
    </div>
  );
}
