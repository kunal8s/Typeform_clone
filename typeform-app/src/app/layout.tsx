import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Typeform — People-Friendly Forms and Surveys",
  description:
    "Build beautiful, interactive forms — get more responses. No coding needed. Templates for quizzes, research, feedback, lead generation, and more.",
  keywords: ["typeform", "forms", "surveys", "quizzes", "feedback"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
