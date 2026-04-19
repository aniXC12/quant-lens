import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const displayFont = localFont({
  src: [
    {
      path: "../public/fonts/openai-sans-light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/openai-sans-light-italic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../public/fonts/openai-sans-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/openai-sans-regular-italic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/openai-sans-medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/openai-sans-medium-italic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../public/fonts/openai-sans-semibold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/openai-sans-semibold-italic.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../public/fonts/openai-sans-bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/openai-sans-bold-italic.otf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = localFont({
  src: [
    {
      path: "../public/fonts/sf-pro-display-regular.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quant Lens",
  description:
    "Quant Lens translates institutional quant analysis into plain English for retail investors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
