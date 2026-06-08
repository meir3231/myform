"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("פרטי התחברות שגויים. נסה שוב.");
      setLoading(false);
      return;
    }

    const next = params.get("next") || "/dashboard";
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-100 to-slate-200/70">
      <header className="border-b border-slate-200/60 bg-white/70 px-4 py-3 backdrop-blur-sm">
        <BrandLogo size="sm" />
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="page-fade-in w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_20px_50px_-15px_rgba(30,58,95,0.25)]">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-slate-800">כניסת מנהל</h1>
            <p className="text-sm text-slate-500">התחברו כדי לנהל את הטפסים שלכם</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              אימייל
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              dir="ltr"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              סיסמה
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              dir="ltr"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "מתחבר..." : "התחברות"}
          </button>
          </form>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
