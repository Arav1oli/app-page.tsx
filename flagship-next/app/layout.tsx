import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SmsWidget from "@/components/SmsWidget";

export const metadata: Metadata = {
  title: {
    default: "Flagship International Yacht Brokers",
    template: "%s | Flagship International Yacht Brokers",
  },
  description:
    "Sydney's leading new and pre-owned boat broker, based at Rose Bay and Point Piper Marinas with a Queensland office at Gold Coast City Marina.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
        <SmsWidget />
      </body>
    </html>
  );
}
