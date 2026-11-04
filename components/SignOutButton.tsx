"use client";
// Signing out, in the header and in the phone's menu: the session ends and the sign-in page opens.
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "./auth-client";
import { useCopy } from "./copy/client";

export function SignOutButton({ className = "header-link" }: { className?: string }) {
  const copy = useCopy();
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={async () => (await authClient.signOut(), router.push("/login"))}>
      <LogOut aria-hidden="true" className="icon-middle size-4" />
      {copy.signOut}
    </button>
  );
}
