"use client";
// The in-app chat (ADR 0013): a sheet over the book where the player asks Claude, tells what happened or corrects what is on the page,
// by typing or, with a transcription server, by speaking. It opens from the button at the bottom of every page, or from the button on a
// card, with that card as what the chat is about (a chip the player can remove). The conversation is kept on this device; the server
// gets it whole with every message (backend/chat-route.ts). Pictures (a screenshot of the stats, an item) go with the message they are
// attached to and are never kept (ADR 0027, usePictures). When Claude filed or changed something, the page fetches again. Modelled on
// freundebuch's ChatSheet.
import { AudioLines, ImageIcon, ImagePlus, MessageSquareText, Mic, SendHorizontal, SquarePen, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { AboutKind, ChatLink } from "@/backend";
import { useCopy, useLocale } from "../copy/client";
import { ClaudeMark } from "./ClaudeMark";
import { imagesIn, MAX_PICTURES, usePictures, type Pending } from "./usePictures";
import { canRecord, useVoice } from "./useVoice";

/** What a card's button hands the chat: the row, its name for the chip, and the playthrough it is in. */
export type About = { kind: AboutKind; id: string; name: string; playthroughId: string };
/** `shared`: how many pictures went with the player's message; `previews`: those pictures while the page is open (never stored). */
type Turn = { role: "user" | "assistant"; content: string; links?: ChatLink[]; filed?: boolean; shared?: number; previews?: string[] };

const ChatContext = createContext<{ enabled: boolean; open: (about?: About, run?: string) => void }>({ enabled: false, open: () => {} });

// One chat per player on this device. Storage can be blocked or throw (private windows); the chat then lasts while the page is open.
const keyOf = (playerId: string) => `gamepanion.chat.${playerId}`;
const isTurn = (t: unknown): t is Turn =>
  !!t && typeof t === "object" && ((t as Turn).role === "user" || (t as Turn).role === "assistant") && typeof (t as Turn).content === "string";
function load(playerId: string): Turn[] {
  try {
    const t = JSON.parse(localStorage.getItem(keyOf(playerId)) ?? "[]");
    return Array.isArray(t) ? t.filter(isTurn) : [];
  } catch {
    return [];
  }
}
function save(playerId: string, t: Turn[]) {
  try {
    if (t.length) localStorage.setItem(keyOf(playerId), JSON.stringify(t.map((x) => ({ ...x, previews: undefined }))));
    else localStorage.removeItem(keyOf(playerId));
  } catch {}
}

// What goes to the server with the next message: the last turns, at most 40 and 250 000 characters together (the limits of
// backend/chat-route.ts), starting with one of the player's.
function recentTurns(turns: Turn[]): Turn[] {
  let from = Math.max(0, turns.length - 40);
  let chars = turns.slice(from).reduce((n, t) => n + t.content.length, 0);
  while (from < turns.length - 1 && (chars > 250_000 || turns[from].role !== "user")) chars -= turns[from++].content.length;
  return turns.slice(from);
}

// The playthrough whose page is open (any of its tabs).
const pageRun = () => window.location.pathname.match(/^\/p\/([^/]+)/)?.[1];

/**
 * The chat for the pages under it: the button at the bottom, and the sheet once it is opened. Nothing when the chat is off. The chat
 * always opens on a playthrough it names in its header (#81): a card's, else the one whose page is open, else on the home page the
 * Continue card's (`homeRun`); `runs` names them.
 */
export function ChatProvider({
  enabled,
  voice,
  playerId,
  runs,
  homeRun,
  needsKey = false,
  children,
}: {
  enabled: boolean;
  voice: boolean;
  playerId: string;
  runs: Record<string, string>;
  homeRun: string | null;
  /** Where the instance sells: no key of the player's and no hosted-AI plan. The chat's buttons stay, and take the player to the plans
   * instead of opening a chat they couldn't use (ADR 0024). */
  needsKey?: boolean;
  children: ReactNode;
}) {
  const copy = useCopy();
  const router = useRouter();
  const [state, setState] = useState<{ about?: About; run?: string } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const open = useCallback(
    (about?: About, run?: string) => {
      if (needsKey) return router.push("/subscribe");
      opener.current = document.activeElement as HTMLElement | null;
      const here = pageRun() ?? (window.location.pathname === "/" ? (homeRun ?? undefined) : undefined);
      setState({ about, run: about?.playthroughId ?? run ?? here });
    },
    [homeRun, needsKey, router],
  );
  const close = useCallback(() => {
    setState(null);
    opener.current?.focus();
  }, []);
  return (
    <ChatContext.Provider value={{ enabled, open }}>
      {children}
      {enabled && !state && (
        <button
          type="button"
          className="chat-fab"
          aria-label={needsKey ? copy.chatNeedsPlan : copy.askClaude}
          title={needsKey ? copy.chatNeedsPlan : copy.askClaude}
          onClick={() => open()}
        >
          <ClaudeMark />
        </button>
      )}
      {enabled && state && (
        <ChatSheet playerId={playerId} voice={voice} about={state.about} run={state.run} runName={state.run ? runs[state.run] : undefined} onClose={close} />
      )}
    </ChatContext.Provider>
  );
}

/** The button on a card: opens the chat about that card. Nothing when the chat is off. */
export function TalkAbout({ kind, id, name, playthroughId, small = false }: About & { small?: boolean }) {
  const copy = useCopy();
  const { enabled, open } = useContext(ChatContext);
  if (!enabled) return null;
  return (
    <button
      type="button"
      className={small ? "talk-about talk-about-small" : "talk-about"}
      aria-label={copy.talkAbout(name)}
      title={copy.talkAbout(name)}
      onClick={() => open({ kind, id, name, playthroughId })}
    >
      <MessageSquareText aria-hidden="true" />
    </button>
  );
}

/** A button that opens the chat on a playthrough, such as the Continue card's. Nothing when the chat is off. */
export function ChatOn({ playthroughId, label }: { playthroughId: string; label: string }) {
  const { enabled, open } = useContext(ChatContext);
  if (!enabled) return null;
  return (
    <button type="button" className="button-secondary inline-flex items-center gap-2" onClick={() => open(undefined, playthroughId)}>
      <MessageSquareText aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}

const noSubscribe = () => () => {};

function ChatSheet({
  playerId,
  voice,
  about: opened,
  run,
  runName,
  onClose,
}: {
  playerId: string;
  voice: boolean;
  about?: About;
  run?: string;
  runName?: string;
  onClose: () => void;
}) {
  const copy = useCopy();
  const language = useLocale();
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(() => load(playerId));
  const [about, setAbout] = useState(opened);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pictures = usePictures();
  const picker = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const errors: Record<string, string> = {
    chat_limit: copy.chatLimit,
    chat_unavailable: copy.chatUnavailable,
    chat_refused: copy.chatRefused,
    chat_too_long: copy.chatTooLong,
    own_key_rejected: copy.ownKeyRejected,
    needs_key: copy.needsKey,
    quota_used: copy.quotaUsed,
    rate_limited: copy.rateLimited,
  };

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [turns, busy]);

  // The field is one line to start with and grows with the text.
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  // The keyboard starts in the field, and comes back to it once a reply is in.
  useEffect(() => {
    if (!busy) field.current?.focus();
  }, [busy]);

  // Where the browser doesn't shrink the page for the keyboard (Safari on iOS), the overlay follows the visible area itself: it sits on the
  // visual viewport (its top and height, which also move when Safari pans the page to the field), and while the keyboard takes part of the
  // screen the sheet fills what is left, so its header and the field both stay in view.
  const [visible, setVisible] = useState<{ top: number; height: number; keyboard: boolean } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => {
      const full = document.documentElement.clientHeight;
      const keyboard = vv.height < full - 80;
      setVisible(keyboard || vv.offsetTop > 0 ? { top: vv.offsetTop, height: vv.height, keyboard } : null);
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, []);

  // Escape closes the sheet wherever the focus is.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Tab and Shift+Tab go round inside the sheet while it is open; arrow keys stay in it and don't turn the book's pages.
  function keys(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") e.stopPropagation();
    if (e.key !== "Tab" || !sheet.current) return;
    const all = [...sheet.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), textarea:not([disabled])")];
    if (!all.length) return;
    const [first, last] = [all[0], all[all.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const recording = useVoice(
    (text) => send(text, true),
    (message) => setError(message),
  );
  // Known only in the browser; the server renders no microphone.
  const mic = useSyncExternalStore(
    noSubscribe,
    () => voice && canRecord(),
    () => false,
  );

  /** Adds pictures picked, pasted or dropped, and says when some didn't fit or couldn't be read. */
  async function attach(files: File[]) {
    if (!files.length) return;
    setError(null);
    const problem = await pictures.add(files);
    if (problem) setError(problem === "tooMany" ? copy.picturesTooMany(MAX_PICTURES) : copy.pictureUnreadable);
  }

  /** Sends the field and the pictures under it, or `offered` (words spoken in, with the pictures); `spoken` words go into the field
   * when sending fails, and the pictures back under it. */
  async function send(offered?: string, spoken = false) {
    const text = (offered ?? draft).trim();
    if ((!text && !pictures.pending.length) || busy || pictures.working) return;
    setBusy(true);
    setError(null);
    const attached: Pending[] = pictures.take();
    const mine: Turn = { role: "user", content: text, ...(attached.length ? { shared: attached.length, previews: attached.map((p) => p.preview) } : {}) };
    const asked: Turn[] = [...turns, mine];
    setTurns(asked);
    if (!offered) setDraft("");
    const playthroughId = about?.playthroughId ?? run;
    const sent = recentTurns(asked).map(({ role, content, filed, shared }) => ({ role, content, filed, ...(shared ? { shared } : {}) }));
    // The pictures themselves go only with this message: the latest turn carries them instead of their number.
    sent[sent.length - 1] = { role: "user", content: text, filed: undefined, ...(attached.length ? { pictures: attached.map((p) => p.picture) } : {}) };
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turns: sent,
        context: { playthroughId, about: about ? { kind: about.kind, id: about.id } : undefined, language },
      }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    setBusy(false);
    const failed = !res || !body || "code" in body || !res.ok;
    const message = failed ? (body && errors[body.code]) || copy.chatUnavailable : null;
    // Nothing filed: the message goes back into the field to send again. Filed before the failure: say so, so it isn't sent twice.
    if (failed && !body?.filed) {
      setTurns(turns);
      if (!offered || spoken) setDraft(text);
      pictures.restore(attached);
      return setError(res?.status === 413 ? copy.picturesTooBig : message);
    }
    const next: Turn[] = [...asked, { role: "assistant", content: failed ? copy.filedThenFailed(message!) : body.reply, links: body.links, filed: body.filed }];
    setTurns(next);
    save(playerId, next);
    if (body.filed) router.refresh();
  }

  function reset() {
    setTurns([]);
    save(playerId, []);
    setError(null);
    setAbout(undefined);
  }

  return (
    <div className="chat-overlay" onKeyDown={keys} style={visible ? { top: visible.top, height: visible.height, bottom: "auto" } : undefined}>
      <div className="chat-backdrop" onClick={onClose} />
      <section
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={copy.chatTitle}
        className="chat-sheet"
        style={visible?.keyboard ? { top: 0, height: "auto" } : undefined}
      >
        <header className="flex items-center gap-2 px-4 pt-4 pb-2">
          <h2 className="flex min-w-0 flex-1 items-center gap-2 text-xl font-bold">
            <ClaudeMark className="h-7 w-7 shrink-0" />
            <span className="min-w-0">
              {copy.chatTitle}
              {runName && <span className="block truncate text-sm font-semibold text-muted">{copy.chatOn(runName)}</span>}
            </span>
          </h2>
          <button type="button" onClick={reset} className="chat-tool">
            <SquarePen aria-hidden="true" className="h-4 w-4" />
            {copy.newChat}
          </button>
          <button type="button" aria-label={copy.closeChat} title={copy.closeChat} onClick={onClose} className="chat-icon-button">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-4 py-2">
          {about && (
            <span className="chat-chip">
              {copy.aboutChip(about.name)}
              <button type="button" aria-label={copy.removeContext} title={copy.removeContext} onClick={() => setAbout(undefined)} className="chat-chip-x">
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {turns.length === 0 && (
            <div className="mt-4 space-y-3 text-center">
              <p className="text-muted">{copy.chatHello}</p>
              <ul className="flex flex-col items-center gap-2" aria-label={copy.chatExamples}>
                {copy.chatPrompts.map((p) => (
                  <li key={p.text}>
                    <button
                      type="button"
                      className="chat-example"
                      onClick={() => {
                        setDraft(p.text);
                        field.current?.focus();
                      }}
                    >
                      <span className="text-sm font-semibold text-muted">{p.kind}</span> {p.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {turns.map((t, i) =>
            t.role === "user" ? (
              <div key={i} className="flex max-w-[85%] flex-col items-end gap-1.5 self-end">
                {t.previews?.length ? (
                  <span className="flex flex-wrap justify-end gap-1.5">
                    {t.previews.map((src, n) => (
                      // eslint-disable-next-line @next/next/no-img-element -- an object URL of the player's own picture, never optimised
                      <img key={src} src={src} alt={copy.pictureN(n + 1)} className="chat-picture" />
                    ))}
                  </span>
                ) : t.shared ? (
                  <span className="chat-shared">
                    <ImageIcon aria-hidden="true" className="h-4 w-4" />
                    {copy.picturesShared(t.shared)}
                  </span>
                ) : null}
                {t.content && <p className="chat-bubble chat-mine max-w-full">{t.content}</p>}
              </div>
            ) : (
              <div key={i} className="flex max-w-[85%] flex-col items-start gap-1.5 self-start">
                <p className="chat-bubble chat-theirs">{t.content}</p>
                {t.links && t.links.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {t.links.map((l) => (
                      <Link key={l.url} href={l.url} onClick={onClose} className="chat-link">
                        {l.name}
                      </Link>
                    ))}
                  </span>
                )}
              </div>
            ),
          )}
          {recording.state === "transcribing" && (
            <p role="status" className="chat-bubble chat-mine flex items-center gap-2 opacity-80">
              <AudioLines aria-hidden="true" className="h-4 w-4 shrink-0 motion-safe:animate-pulse" />
              <span className="text-sm">{copy.voiceTranscribing}</span>
            </p>
          )}
          {busy && (
            <p role="status" className="chat-bubble chat-theirs flex items-center gap-2">
              <span aria-hidden="true" className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 rounded-full bg-accent motion-safe:animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
              <span className="text-sm text-muted">{copy.thinking}</span>
            </p>
          )}
          <div ref={end} />
        </div>

        {error && (
          <p role="alert" className="mx-4 rounded-lg border border-error px-3 py-2 text-sm text-error">
            {error}
            {(error === copy.ownKeyRejected || error === copy.needsKey || error === copy.quotaUsed) && (
              <>
                {" "}
                <Link href="/account#key" className="font-semibold underline" onClick={onClose}>
                  {copy.ownKeySettings}
                </Link>
              </>
            )}
          </p>
        )}
        {pictures.pending.length > 0 && (
          <ul aria-label={copy.picturesToSend} className="mx-4 mt-2 flex flex-wrap gap-2">
            {pictures.pending.map((p, n) => (
              <li key={p.key} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- an object URL of the player's own picture, never optimised */}
                <img src={p.preview} alt={copy.pictureN(n + 1)} className="chat-picture" />
                <button
                  type="button"
                  aria-label={copy.removePicture(n + 1)}
                  title={copy.removePicture(n + 1)}
                  onClick={() => pictures.remove(p.key)}
                  className="chat-picture-remove"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="chat-form"
          style={{ marginBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            const files = imagesIn(e.dataTransfer.files);
            if (!files.length) return;
            e.preventDefault();
            attach(files);
          }}
        >
          {recording.state === "recording" ? (
            <>
              <button type="button" aria-label={copy.voiceCancel} title={copy.voiceCancel} onClick={recording.cancel} className="chat-icon-button -ml-2">
                <Trash2 aria-hidden="true" className="h-5 w-5" />
              </button>
              <p role="status" className="flex min-h-10 flex-1 items-center gap-2 py-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-error motion-safe:animate-pulse" />
                <span className="sr-only">{copy.voiceRecording}</span>
                <span className="tabular-nums">{`${Math.floor(recording.seconds / 60)}:${String(recording.seconds % 60).padStart(2, "0")}`}</span>
              </p>
              <button type="button" aria-label={copy.voiceSend} title={copy.voiceSend} onClick={recording.send} className="chat-send">
                <SendHorizontal aria-hidden="true" className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <input
                ref={picker}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  attach(imagesIn(e.target.files));
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                aria-label={copy.addPicture}
                title={copy.addPicture}
                disabled={busy || pictures.working || pictures.pending.length >= MAX_PICTURES}
                onClick={() => picker.current?.click()}
                className="chat-icon-button -ml-2.5 disabled:opacity-40"
              >
                <ImagePlus aria-hidden="true" className={`h-5 w-5 ${pictures.working ? "motion-safe:animate-pulse" : ""}`} />
              </button>
              <textarea
                ref={field}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter starts a new line, as on a phone it has to; Ctrl+Enter or ⌘+Enter sends from a keyboard.
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
                onPaste={(e) => {
                  // A copied picture comes as a file; copied text that carries a picture too (cells from a sheet) is pasted as text.
                  const files = imagesIn(e.clipboardData.files);
                  if (!files.length || e.clipboardData.types.includes("text/plain")) return;
                  e.preventDefault();
                  attach(files);
                }}
                enterKeyHint="enter"
                aria-label={copy.message}
                placeholder={copy.chatPlaceholder}
                rows={1}
                className="max-h-40 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 leading-6 outline-none"
              />
              {mic && !draft.trim() && !pictures.pending.length ? (
                <button
                  type="button"
                  aria-label={recording.state === "transcribing" ? copy.voiceTranscribing : copy.voiceRecord}
                  title={recording.state === "transcribing" ? copy.voiceTranscribing : copy.voiceRecord}
                  disabled={busy || recording.state !== "idle"}
                  onClick={() => {
                    setError(null);
                    recording.start();
                  }}
                  className="chat-send"
                >
                  <Mic aria-hidden="true" className={`h-5 w-5 ${recording.state === "transcribing" ? "motion-safe:animate-pulse" : ""}`} />
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label={copy.send}
                  title={copy.send}
                  disabled={busy || pictures.working || (!draft.trim() && !pictures.pending.length)}
                  className="chat-send"
                >
                  <SendHorizontal aria-hidden="true" className="h-5 w-5" />
                </button>
              )}
            </>
          )}
        </form>
      </section>
    </div>
  );
}
