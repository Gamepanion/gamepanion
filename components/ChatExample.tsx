// What Gamepanion is, in one picture (#97): a chat window between you and Claude, and Gamepanion beside it, with an arrow wherever
// Claude uses it (record when you tell, briefing when you ask). Invented game, nothing interactive; the docs landing draws the same
// (docs/index.md, .gp-chat in docs/stylesheets/extra.css).
import { UserRound } from "lucide-react";
import { ClaudeMark } from "./chat/ClaudeMark";
import type { Copy } from "./copy";

export function ChatExample({ copy, className = "" }: { copy: Copy; className?: string }) {
  const c = copy.chatExample;
  return (
    <figure className={`gp-chat ${className}`} aria-label={c.label}>
      <div className="gp-chat__window">
        <div className="gp-chat__head">
          <ClaudeMark className="gp-chat__claude-mark" />
          <span>{c.claude}</span>
        </div>
        <ol className="gp-chat__log">
          {c.lines.map((l, i) =>
            l.who === "later" ? (
              <li key={i} className="gp-chat__later">
                {l.text}
              </li>
            ) : (
              <li key={i} className={`gp-chat__msg gp-chat__msg--${l.who}`}>
                <span className="gp-chat__avatar" aria-hidden="true">
                  {l.who === "you" ? <UserRound /> : <ClaudeMark />}
                </span>
                <p className="gp-chat__bubble">
                  <span className="sr-only">{l.who === "you" ? c.you : c.claude}: </span>
                  {l.text}
                </p>
                {l.tool && (
                  <span className="gp-chat__call">
                    <span className="sr-only">{c.uses} </span>
                    <span className="gp-chat__tool">{l.tool}</span>
                  </span>
                )}
              </li>
            ),
          )}
        </ol>
      </div>
      <div className="gp-chat__rail">
        <span className="gp-chat__app">
          {/* eslint-disable-next-line @next/next/no-img-element -- the app's own icon, no optimizer */}
          <img src="/icon.svg" alt="" width={36} height={36} />
          <span>Gamepanion</span>
        </span>
      </div>
    </figure>
  );
}
