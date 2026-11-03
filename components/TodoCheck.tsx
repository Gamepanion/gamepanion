"use client";
// A to-do's checkbox on the To-dos tab (ADR 0020): ticking it marks the to-do done, unticking opens it again, through correct as when the
// player tells Claude. The box is labelled by the to-do's own words, so a screen reader hears what is being ticked off.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setTodoStatus } from "@/app/(app)/actions";

export function TodoCheck({ id, done, label }: { id: string; done: boolean; label: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState(done);
  const [pending, start] = useTransition();
  return (
    <input
      type="checkbox"
      className="todo-check"
      checked={checked}
      aria-label={label}
      aria-busy={pending}
      onChange={(e) => {
        const next = e.target.checked;
        setChecked(next);
        start(async () => {
          await setTodoStatus(id, next ? "done" : "open");
          router.refresh();
        });
      }}
    />
  );
}
