"use client";
// Pictures for the chat's next message (ADR 0027): picked, pasted or dropped, they wait under the field until the message is sent. Each
// is shrunk here to fit PICTURE_EDGE pixels and encoded again as JPEG, which also leaves out its EXIF data (where the photo was taken),
// so the server gets a small, plain picture to hand to Claude. Nothing of it is kept: the stored chat says only how many there were.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatPicture } from "@/backend";

// The limits of backend/chat.ts (MAX_PICTURES, PICTURE_EDGE).
export const MAX_PICTURES = 4;
const PICTURE_EDGE = 1568;
const QUALITY = 0.88;

/** A picture waiting to be sent: what goes to the server, and an object URL to show it by. */
export type Pending = { key: string; picture: ChatPicture; preview: string };

let counter = 0;

/** The file as a JPEG of at most PICTURE_EDGE pixels on its longer edge, base64; null when the browser can't read it as a picture. */
async function shrink(file: File): Promise<{ picture: ChatPicture; blob: Blob } | null> {
  try {
    // imageOrientation: the way the EXIF says, so a phone photo stays upright once the EXIF is gone.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, PICTURE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // A transparent PNG would turn black in a JPEG: white under it.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", QUALITY));
    if (!blob) return null;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { picture: { mediaType: "image/jpeg", data: btoa(binary) }, blob };
  } catch {
    return null;
  }
}

/** The image files among a paste's or a drop's. */
export const imagesIn = (list: FileList | null | undefined): File[] => [...(list ?? [])].filter((f) => f.type.startsWith("image/"));

/**
 * The pending pictures and what changes them. `add` shrinks the files that still fit and says what went wrong: `tooMany` when some were
 * left out, `unreadable` when one couldn't be read. `take` hands them over for sending and empties the list (their previews stay valid
 * for the bubble that shows them); `restore` puts them back when sending failed.
 */
export function usePictures() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [working, setWorking] = useState(false);
  const live = useRef(pending);
  useEffect(() => {
    live.current = pending;
  }, [pending]);

  const add = useCallback(async (files: File[]): Promise<"tooMany" | "unreadable" | null> => {
    if (!files.length) return null;
    const room = Math.max(0, MAX_PICTURES - live.current.length);
    const fit = files.slice(0, room);
    setWorking(true);
    const made = await Promise.all(fit.map(shrink));
    setWorking(false);
    const added = made
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => ({ key: `${Date.now()}-${counter++}`, picture: m.picture, preview: URL.createObjectURL(m.blob) }));
    setPending((p) => [...p, ...added].slice(0, MAX_PICTURES));
    return fit.length < files.length ? "tooMany" : added.length < fit.length ? "unreadable" : null;
  }, []);

  const remove = useCallback((key: string) => {
    setPending((p) => {
      const gone = p.find((x) => x.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return p.filter((x) => x.key !== key);
    });
  }, []);

  const take = useCallback(() => {
    const now = live.current;
    setPending([]);
    return now;
  }, []);

  const restore = useCallback((back: Pending[]) => setPending(back), []);

  return { pending, working, add, remove, take, restore };
}
