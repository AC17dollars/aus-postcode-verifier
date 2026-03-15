import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getSession } from "@/lib/session";
import {
  normalizeStoragePreference,
  STORAGE_PREF_ATTR,
} from "@/lib/storage-pref";
import { GraphQLProvider } from "@/components/graphql-provider";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AC17's Australia Post Address Verifier",
  description: "Lawpath Address Verifier",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const storagePref = normalizeStoragePreference(session?.storagePreference);

  return (
    <html lang="en">
      <body
        className={`${jakarta.variable} antialiased`}
        {...{ [STORAGE_PREF_ATTR]: storagePref }}
      >
        <SessionProvider session={session}>
          <GraphQLProvider>{children}</GraphQLProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
