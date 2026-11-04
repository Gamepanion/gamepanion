// The logo (ADR 0018, docs/internals/brand.md): the speech-bubble icon, then "Game" in the text colour and "panion" in the soft violet.
// The name is never translated, so the two halves are written out here. Its baseline is the name's, the icon centred
// on the name's capitals (.icon-middle), so the header lines it up with the rest.

export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const icon = size === "lg" ? 44 : 34;
  return (
    <span className={`inline-flex items-baseline font-extrabold tracking-[-0.035em] ${size === "lg" ? "gap-3 text-4xl" : "gap-2.5 text-2xl"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the app's own icon, no optimizer */}
      <img src="/icon.svg" alt="" width={icon} height={icon} className="icon-middle" />
      <span>
        Game<span className="text-accent-soft">panion</span>
      </span>
    </span>
  );
}
