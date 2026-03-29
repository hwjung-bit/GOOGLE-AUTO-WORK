import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Google Workspace 자동화 어시스턴트",
  description: "Gmail, Drive, Calendar 자동화 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
