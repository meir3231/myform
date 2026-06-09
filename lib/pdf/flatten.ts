import "server-only";
import { readFileSync } from "fs";
import path from "path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
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

// כיווניות (bidi): bidi-js מפיק את הסדר הוויזואלי הנכון (ספרות נשמרות בכיוונן).
// אבל מנועי pdfium (Chrome/Edge/Acrobat) מסדרים מחדש מחרוזת שלמה בעצמם וגורמים
// להיפוך כפול. לכן מציירים תו-תו במיקום מפורש — כך המנוע אינו מסדר מחדש.
function toVisualChars(text: string): string[] {
  const levels = bidi.getEmbeddingLevels(text, "rtl");
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
      // מסגרת קופסא + סימון ✓ אם מסומן
      const bx = boxX;
      const by = topPdfY - boxH;
      page.drawRectangle({ x: bx, y: by, width: boxW, height: boxH, borderWidth: 1, borderColor: rgb(0.3, 0.3, 0.3), color: rgb(1, 1, 1) });
      if (value === "true") {
        const size = Math.max(6, boxH * 0.78);
        const checkX = bx + boxW * 0.08;
        const checkY = by + (boxH - size) / 2 + size * 0.12;
        page.drawText("✓", { x: checkX, y: checkY, size, font, color: rgb(0.06, 0.09, 0.16) });
      }
    } else if (value && value.trim()) {
      const size = Math.max(6, Math.min(field.font_size, boxH * 0.85));
      const baselineY = topPdfY - boxH + (boxH - size) / 2 + size * 0.18;
      drawRtlText(page, font, value.trim(), boxX, boxW, baselineY, size);
    }
  }

  return await doc.save();
}
