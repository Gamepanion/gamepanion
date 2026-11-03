// The sign-in page (ADR 0018): the wordmark and the slogan set large, the sign-in in a panel next to them; stacked on a phone.
import type { RefusedSignIn } from "@/backend";
import type { Copy } from "./copy";
import { LoginForm } from "./LoginForm";
import { Wordmark } from "./Wordmark";

type Methods = { emailCode: boolean; providers: { id: string; label: string }[] };

export function SignIn({ copy, methods, next, refused }: { copy: Copy; methods: Methods; next: string; refused?: RefusedSignIn | null }) {
  return (
    <div className="sign-in">
      <div>
        <Wordmark size="lg" />
        <p className="slogan mt-8">
          {copy.sloganPlay}
          <br />
          <em>{copy.sloganRemembers}</em>
        </p>
        <p className="mt-6 max-w-md text-lg text-muted">{copy.tagline}</p>
      </div>
      <section className="sign-in-panel" aria-labelledby="sign-in-title">
        <h1 id="sign-in-title" className="text-2xl">
          {copy.signInTitle}
        </h1>
        <p className="mt-1 mb-5 text-sm text-muted">{copy.signInLead}</p>
        <LoginForm methods={methods} next={next} refused={refused} />
      </section>
    </div>
  );
}
