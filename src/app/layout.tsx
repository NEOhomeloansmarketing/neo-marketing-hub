import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEO Marketing Hub",
  description: "Marketing operations hub for the NEO Home Loans team",
  icons: {
    icon: "/neo-icon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
