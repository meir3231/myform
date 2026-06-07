import "server-only";
import { PDFDocument } from "pdf-lib";

// טוען PDF מ-bytes ומחזיר מספר עמודים ומידות כל עמוד (בנקודות).
export async function readPdfMeta(bytes: Uint8Array | ArrayBuffer) {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();
  return {
    pageCount: pages.length,
    pageSizes: pages.map((p) => ({ width: p.getWidth(), height: p.getHeight() })),
  };
}
