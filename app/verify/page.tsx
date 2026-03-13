import { verifyEmail } from "@/app/actions/auth";
import { VerifyResult } from "@/components/verify-result";

type Status = "loading" | "success" | "error";

export default async function VerifyPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ token?: string }>;
}>) {
  const { token } = await searchParams;
  let status: Status;
  let message: string;

  if (token) {
    const result = await verifyEmail(token);
    if (result.success) {
      status = "success";
      message = result.success;
    } else {
      status = "error";
      message = result.error || "Something went wrong.";
    }
  } else {
    status = "error";
    message = "No verification token provided.";
  }

  return <VerifyResult status={status} message={message} />;
}
