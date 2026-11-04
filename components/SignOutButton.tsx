"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "./auth-client";
import { useCopy } from "./copy/client";

export function SignOutButton() {
  const copy = useCopy();
  const router = useRouter();
  return (
    <button type="button" className="header-link" aria-label={copy.signOut} onClick={async () => (await authClient.signOut(), router.push("/login"))}>
      <LogOut aria-hidden="true" />
      <span className="hidden sm:inline">{copy.signOut}</span>
    </button>
  );
}
