"use client";

import dynamic from "next/dynamic";

// react-pdf / pdfjs נטענים בצד לקוח בלבד (תלויים ב-DOM globals).
const SendPreview = dynamic(() => import("./SendPreview"), {
  ssr: false,
  loading: () => <div className="skeleton h-[34rem] w-full" />,
});

export function SendPreviewLoader(props: { pdfUrl: string; pageCount: number }) {
  return <SendPreview {...props} />;
}
