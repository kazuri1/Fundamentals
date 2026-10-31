import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fundaments — First-Principles Engineering Education",
  description: "Independent learning platform with persistent learner intelligence and AI integrations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}