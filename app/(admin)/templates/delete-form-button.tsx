"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteForm } from "@/app/(admin)/forms/actions";

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
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "מוחק..." : "אישור מחיקה"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:text-slate-700"
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
      className="btn-danger-ghost"
    >
      מחיקה
    </button>
  );
}
