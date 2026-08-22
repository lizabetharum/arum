import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "A private, searchable home for your work — notes, documents, artifacts and images, organized by project.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
