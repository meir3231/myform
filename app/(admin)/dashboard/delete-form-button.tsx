"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteForm } from "../forms/actions";

export function DeleteFormButton({
  formId,
  formName,
}: {
  formId: string;
  formName: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteForm(formId);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={pending}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "מוחק..." : "אישור מחיקה"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          ביטול
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`מחיקת ${formName}`}
      className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
    >
      מחיקה
    </button>
  );
}
