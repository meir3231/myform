"use client";

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors
        focus:outline-none focus:ring-2 focus:ring-brand/30
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? "justify-start bg-brand" : "justify-end bg-border"}`}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow transition-transform" />
    </button>
  );
}
