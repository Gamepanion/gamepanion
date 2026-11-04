import type { Metadata } from "next";
import { refusedSignIn, safeNext, signInMethods } from "@/backend";
import { serverCopy } from "@/components/copy/server";
import { SignIn } from "@/components/SignIn";
import { Footer } from "@/components/Footer";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await serverCopy()).signInTitle };
}
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const query = await searchParams;
  const copy = await serverCopy();
  return (
    <main>
      {/* After deleting the account (#106): the account page sends the browser here. */}
      {query.deleted !== undefined && (
        <p role="status" className="mx-auto max-w-5xl px-4 pt-6 font-semibold lg:px-8">
          {copy.accountDeleted}
        </p>
      )}
      <SignIn copy={copy} methods={signInMethods()} next={safeNext(query.next)} refused={refusedSignIn(query)} />
      <div className="mx-auto max-w-5xl">
        <Footer />
      </div>
    </main>
  );
}
