export function SiteFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer
      className={`border-t px-4 py-4 text-center text-xs ${
        dark
          ? "border-ink-line bg-ink-panel/60 text-ink-muted"
          : "border-paper-line bg-white/60 text-slate-400"
      }`}
    >
      © {new Date().getFullYear()} Smart Form — מערכת לניהול וחתימה דיגיטלית של טפסים
    </footer>
  );
}
