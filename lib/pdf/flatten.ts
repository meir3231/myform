import "server-only";
import { readFileSync } from "fs";
import path from "path";
import { PDFDocument, rgb, LineCapStyle, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import bidiFactory from "bidi-js";
import type { FieldDraft } from "@/lib/fields";

const bidi = bidiFactory();

// טעינת פונט עברי (Heebo) פעם אחת. נכלל ב-bundle דרך outputFileTracingIncludes.
let fontCache: Buffer | null = null;
function loadHebrewFont(): Buffer {
  if (!fontCache) {
    fontCache = readFileSync(path.join(process.cwd(), "public", "fonts", "Heebo.ttf"));
  }
  return fontCache;
}

// בודק אם המחרוזת מכילה תווים עבריים (כולל ניקוד וצורות מיוחדות).
function hasHebrewChar(text: string): boolean {
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if ((code >= 0x0590 && code <= 0x05ff) || (code >= 0xfb1d && code <= 0xfb4f)) return true;
  }
  return false;
}

// כיווניות (bidi): bidi-js מפיק את הסדר הוויזואלי הנכון (ספרות נשמרות בכיוונן).
// אבל מנועי pdfium (Chrome/Edge/Acrobat) מסדרים מחדש מחרוזת שלמה בעצמם וגורמים
// להיפוך כפול. לכן מציירים תו-תו במיקום מפורש — כך המנוע אינו מסדר מחדש.
// הערה: מחרוזת ללא תווים עבריים (למשל תאריך "10/06/2026") אינה זקוקה לבסיס RTL —
// אילוץ "rtl" על מחרוזת כזו גורם ל-bidi-js להפיק היפוך שגוי (פס יחיד במקום שני
// פסים שמבטלים זה את זה), כך שהיא מוצגת הפוכה.
function toVisualChars(text: string): string[] {
  const baseDir = hasHebrewChar(text) ? "rtl" : "ltr";
  const levels = bidi.getEmbeddingLevels(text, baseDir);
  const segments = bidi.getReorderSegments(text, levels);
  const chars = [...text];
  for (const [start, end] of segments) {
    const slice = chars.slice(start, end + 1).reverse();
    for (let i = start; i <= end; i++) chars[i] = slice[i - start];
  }
  return chars;
}

// מצייר טקסט מעורב עברית/מספרים בתיבה, מיושר לימין, תו-תו בסדר ויזואלי.
function drawRtlText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  boxX: number,
  boxW: number,
  baselineY: number,
  size: number
) {
  const visual = toVisualChars(text);
  const widths = visual.map((c) => {
    try {
      return font.widthOfTextAtSize(c, size);
    } catch {
      return 0;
    }
  });
  const total = widths.reduce((a, b) => a + b, 0);
  let x = Math.max(boxX + 1, boxX + boxW - total - 2); // יישור לימין
  for (let i = 0; i < visual.length; i++) {
    try {
      page.drawText(visual[i], { x, y: baselineY, size, font, color: rgb(0.06, 0.09, 0.16) });
    } catch {
      // תו שאינו נתמך בפונט — מדלגים עליו
    }
    x += widths[i];
  }
}

// ממיר תאריך מפורמט ISO (YYYY-MM-DD, מ-input type="date") לפורמט יום/חודש/שנה הנהוג בטפסים.
function formatDateValue(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

export interface FlattenInput {
  field: FieldDraft;
  value?: string; // text/number/date
  signaturePng?: Uint8Array; // signature/initials
}

// מטביע את הערכים והחתימות על ה-PDF המקורי ומחזיר PDF מושטח.
export async function flattenPdf(
  originalBytes: Uint8Array,
  inputs: FlattenInput[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(originalBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(loadHebrewFont(), { subset: true });
  const pages = doc.getPages();

  for (const { field, value, signaturePng } of inputs) {
    const page = pages[field.page - 1];
    if (!page) continue;

    const { width: pw, height: ph } = page.getSize();
    const boxX = field.x * pw;
    const boxW = field.width * pw;
    const boxH = field.height * ph;
    const topPdfY = ph - field.y * ph; // קצה עליון של התיבה בקואורדינטות PDF

    if ((field.type === "signature" || field.type === "initials") && signaturePng) {
      const img = await doc.embedPng(signaturePng);
      const scale = Math.min(boxW / img.width, boxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = boxX + (boxW - w) / 2;
      const y = topPdfY - boxH + (boxH - h) / 2;
      page.drawImage(img, { x, y, width: w, height: h });
    } else if (field.type === "checkbox") {
      // לא מציירים מסגרת — אם הלקוח לא סימן, לא נראה שום שדה בטופס המוגמר.
      if (value === "true") {
        // ציור ✓ כקווים וקטוריים — לא תלוי בקיום הסימן בגופן (Heebo חסר את הגליף ✓)
        const bx = boxX;
        const by = topPdfY - boxH;
        const thickness = Math.max(1.2, boxH * 0.12);
        const color = rgb(0.06, 0.09, 0.16);
        page.drawLine({
          start: { x: bx + boxW * 0.18, y: by + boxH * 0.52 },
          end: { x: bx + boxW * 0.42, y: by + boxH * 0.22 },
          thickness,
          color,
          lineCap: LineCapStyle.Round,
        });
        page.drawLine({
          start: { x: bx + boxW * 0.42, y: by + boxH * 0.22 },
          end: { x: bx + boxW * 0.84, y: by + boxH * 0.78 },
          thickness,
          color,
          lineCap: LineCapStyle.Round,
        });
      }
    } else if (value && value.trim()) {
      const text = field.type === "date" ? formatDateValue(value.trim()) : value.trim();
      const size = Math.max(6, Math.min(field.font_size, boxH * 0.85));
      const baselineY = topPdfY - boxH + (boxH - size) / 2 + size * 0.18;
      drawRtlText(page, font, text, boxX, boxW, baselineY, size);
    }
  }

  return await doc.save();
}
