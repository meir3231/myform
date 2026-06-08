import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Form — ניהול טפסים דיגיטליים",
  description: "מערכת לניהול, שליחה וחתימה של טפסי PDF דיגיטליים",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
