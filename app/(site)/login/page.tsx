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
      <SignIn copy={copy} methods={signInMethods()} next={safeNext(query.next)} refused={refusedSignIn(query)} />
      <div className="mx-auto max-w-5xl">
        <Footer />
      </div>
    </main>
  );
}
