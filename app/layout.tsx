import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GraphQLProvider } from "@/components/graphql-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AC17's Australia Post Address Verifier",
  description: "Lawpath Address Verifier",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} antialiased`}>
        <GraphQLProvider>{children}</GraphQLProvider>
      </body>
    </html>
  );
}
