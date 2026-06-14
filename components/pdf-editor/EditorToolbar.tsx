"use client";

import { FIELD_META, FIELD_TYPES } from "@/lib/fields";
import type { FieldType } from "@/lib/database.types";
import {
  ExitFullscreenIcon,
  FieldTypeIcon,
  FieldsIcon,
  FullscreenIcon,
} from "./icons";

// סרגל הכלים הפנימי של אזור המסמך: כפתורי הוספת שדה (6 סוגים, עם תווית ואייקון),
// אינדיקטור עמוד (הניווט בין עמודים מתבצע בגלילה) ומסך מלא. מוצג בראש אזור המסמך.
export function EditorToolbar({
  placing,
  onStartPlacing,
  currentPage,
  pageCount,
  isFullscreen,
  onToggleFullscreen,
  fieldCount,
  onOpenFieldsDrawer,
}: {
  placing: FieldType | null;
  onStartPlacing: (type: FieldType) => void;
  currentPage: number;
  pageCount: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  fieldCount: number;
  onOpenFieldsDrawer: () => void;
}) {
  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-fields">
        {FIELD_TYPES.map((t) => {
          const active = placing === t;
          return (
            <button
              key={t}
              type="button"
              title={`הוספת שדה ${FIELD_META[t].label}`}
              aria-label={`הוספת שדה ${FIELD_META[t].label}`}
              onClick={() => onStartPlacing(t)}
              className={`editor-toolbar-btn ${active ? "is-active" : ""}`}
              style={
                active
                  ? {
                      borderColor: FIELD_META[t].color,
                      color: FIELD_META[t].color,
                      backgroundColor: `${FIELD_META[t].color}1a`,
                    }
                  : undefined
              }
            >
              <span className="editor-toolbar-btn-label">{FIELD_META[t].label}</span>
              <FieldTypeIcon type={t} className="h-[18px] w-[18px]" style={{ color: FIELD_META[t].color }} />
            </button>
          );
        })}
      </div>

      <div className="editor-toolbar-nav">
        <button
          type="button"
          onClick={onOpenFieldsDrawer}
          className="editor-toolbar-fields-trigger"
          aria-label="כל השדות"
        >
          <FieldsIcon className="h-4 w-4" />
          <span>שדות</span>
          <span className="editor-toolbar-fields-count">{fieldCount}</span>
        </button>

        {pageCount > 1 && (
          <span className="editor-toolbar-page-label">
            עמוד {currentPage} מתוך {pageCount}
          </span>
        )}

        <button
          type="button"
          onClick={onToggleFullscreen}
          className="editor-toolbar-icon-btn"
          aria-label={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
          title={isFullscreen ? "יציאה ממסך מלא" : "מסך מלא"}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      </div>
    </div>
  );
}
