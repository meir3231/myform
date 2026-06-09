"use client";

import { useRef, useState, useTransition } from "react";
import { createUser, changeRole, removeUser } from "./actions";
import { useToast } from "@/components/Toast";

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  formCount: number;
}

export function UsersClient({
  users: initialUsers,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function handleRoleToggle(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "member" : "admin";
    startTransition(async () => {
      const res = await changeRole(userId, newRole as "admin" | "member");
      if (res.error) {
        showToast(res.error, "error");
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        showToast("התפקיד עודכן", "success");
      }
    });
  }

  function handleRemove(userId: string, name: string) {
    if (!confirm(`האם למחוק את המשתמש "${name}"? פעולה זו אינה הפיכה.`)) return;
    startTransition(async () => {
      const res = await removeUser(userId);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showToast("המשתמש הוסר", "success");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} משתמשים בארגון</p>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + הוסף משתמש
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-paper-line bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-right font-medium">שם</th>
              <th className="px-4 py-3 text-right font-medium">אימייל</th>
              <th className="px-4 py-3 text-right font-medium">תפקיד</th>
              <th className="px-4 py-3 text-right font-medium">הצטרפות</th>
              <th className="px-4 py-3 text-right font-medium">טפסים</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-line">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {u.fullName || "—"}
                    {isSelf && (
                      <span className="mr-2 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                        אתה
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500" dir="ltr">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.role === "admin"
                          ? "bg-brand/10 text-brand"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role === "admin" ? "מנהל" : "חבר"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.formCount}</td>
                  <td className="px-4 py-3">
                    {!isSelf && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRoleToggle(u.id, u.role)}
                          disabled={pending}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          {u.role === "admin" ? "הפוך לחבר" : "הפוך למנהל"}
                        </button>
                        <button
                          onClick={() => handleRemove(u.id, u.fullName)}
                          disabled={pending}
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          הסר
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onAdded={(newUser) => {
            setUsers((prev) => [...prev, newUser]);
            setShowModal(false);
            showToast("המשתמש נוסף בהצלחה", "success");
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (user: UserRow) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setError(null);
    startTransition(async () => {
      const res = await createUser(fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      // server revalidates path — close and parent will refetch on next navigation
      // For optimistic update we build a partial object
      onAdded({
        id: crypto.randomUUID(),
        fullName: (fd.get("full_name") as string) ?? "",
        email: (fd.get("email") as string) ?? "",
        role: (fd.get("role") as string) ?? "member",
        createdAt: new Date().toISOString(),
        formCount: 0,
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-800">הוספת משתמש חדש</h2>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">שם מלא</label>
            <input
              name="full_name"
              type="text"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">אימייל</label>
            <input
              name="email"
              type="email"
              required
              dir="ltr"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">סיסמה</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              dir="ltr"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">תפקיד</label>
            <select
              name="role"
              defaultValue="member"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="member">חבר</option>
              <option value="admin">מנהל</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "מוסיף..." : "הוסף משתמש"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
