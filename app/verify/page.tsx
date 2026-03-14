import { redirect } from "next/navigation";

export default async function VerifyPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ token?: string }>;
}>) {
  const { token } = await searchParams;
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  redirect(`/verify-email${qs}`);
}
