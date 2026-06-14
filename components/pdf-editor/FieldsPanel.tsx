"use client";

import { useEffect, useRef } from "react";
import { FIELD_META, type FieldDraft } from "@/lib/fields";
import { ChevronDownIcon, FieldTypeIcon, SearchIcon, TrashIcon } from "./icons";

// פאנל "כל השדות" (300px): רשימה הניתנת לחיפוש, כל שורה נפתחת לעריכת
// מאפייני השדה inline (רק שורה אחת פתוחה בכל זמן, מסונכרן עם הבחירה ב-PDF).
export function FieldsPanel({
  fields,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  search,
  onSearchChange,
}: {
  fields: FieldDraft[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (f: FieldDraft) => void;
  onDelete: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = fields.filter((f) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (f.label || FIELD_META[f.type].label).toLowerCase().includes(q);
  });

  useEffect(() => {
    if (!selectedId) return;
    rowRefs.current[selectedId]?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-soft-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy">כל השדות</h2>
          <span className="text-xs text-text-secondary">{fields.length} שדות</span>
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="חיפוש שדה..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-full rounded-lg border border-border bg-white py-1 pr-8 pl-2 text-xs text-navy outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-text-secondary">
            {fields.length === 0 ? "עדיין אין שדות בטופס" : "לא נמצאו שדות התואמים את החיפוש"}
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((f) => {
              const expanded = f.id === selectedId;
              return (
                <div
                  key={f.id}
                  ref={(el) => {
                    rowRefs.current[f.id] = el;
                  }}
                  className={`fields-panel-row ${expanded ? "is-expanded" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(expanded ? null : f.id)}
                    className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-xs transition hover:bg-slate-50"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${FIELD_META[f.type].color}1a`, color: FIELD_META[f.type].color }}
                    >
                      <FieldTypeIcon type={f.type} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-navy">
                      {f.label || FIELD_META[f.type].label}
                      <span className="text-text-secondary"> · עמ׳ {f.page}</span>
                    </span>
                    {f.required && <span className="shrink-0 text-brand">*</span>}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(f.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          onDelete(f.id);
                        }
                      }}
                      className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="מחיקת שדה"
                    >
                      <TrashIcon />
                    </span>
                    <ChevronDownIcon
                      className={`h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {expanded && (
                    <div className="space-y-3 border-t border-soft-border px-2.5 py-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-secondary">תווית</label>
                        <input
                          value={f.label}
                          onChange={(e) => onUpdate({ ...f, label: e.target.value })}
                          className="w-full rounded-lg border border-border px-2.5 py-1.5 text-right text-sm text-navy outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-navy">
                        <input
                          type="checkbox"
                          checked={f.required}
                          onChange={(e) => onUpdate({ ...f, required: e.target.checked })}
                          className="h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
                        />
                        שדה חובה
                      </label>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-secondary">גודל גופן</label>
                        <input
                          type="number"
                          min={6}
                          max={72}
                          value={f.font_size}
                          onChange={(e) => onUpdate({ ...f, font_size: Number(e.target.value) || 12 })}
                          className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm text-navy outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                        />
                      </div>
                      {f.type === "date" && (
                        <label className="flex items-center gap-2 text-sm text-navy">
                          <input
                            type="checkbox"
                            checked={!!f.autoFillToday}
                            onChange={(e) => onUpdate({ ...f, autoFillToday: e.target.checked })}
                            className="h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
                          />
                          מילוי אוטומטי של תאריך היום
                        </label>
                      )}
                      {f.type !== "signature" && f.type !== "initials" && (
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-secondary">
                            העתקת ערך משדה אחר
                          </label>
                          <select
                            value={f.copyFrom ?? ""}
                            onChange={(e) => onUpdate({ ...f, copyFrom: e.target.value || null })}
                            className="mb-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-sm text-navy outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                          >
                            <option value="">— ללא (מילוי עצמאי) —</option>
                            {fields
                              .filter((other) => other.id !== f.id && other.type === f.type && !other.copyFrom)
                              .map((other) => (
                                <option key={other.id} value={other.id}>
                                  {other.label || FIELD_META[other.type].label} (עמ׳ {other.page})
                                </option>
                              ))}
                          </select>
                          <p className="text-xs leading-relaxed text-text-secondary">
                            הלקוח ימלא רק את שדה המקור — שאר השדות המקושרים יתמלאו אוטומטית באותו ערך.
                          </p>
                        </div>
                      )}
                      <button onClick={() => onDelete(f.id)} className="btn-danger-ghost w-full">
                        מחיקת שדה
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
