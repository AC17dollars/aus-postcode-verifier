import { verifyEmail } from "@/app/actions/auth";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  VerifyEmailResult,
  VerifyEmailResend,
  VerifyEmailLoggedInPopup,
} from "@/components/verify-email";

export default async function VerifyEmailPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ token?: string; email?: string }>;
}>) {
  const session = await getSession();
  const { token } = await searchParams;

  if (session?.verified && token) {
    const result = await verifyEmail(token);
    return (
      <VerifyEmailLoggedInPopup
        success={!!result.success}
        message={result.success ?? result.error ?? "Something went wrong."}
        email={"email" in result && result.email ? result.email : undefined}
      />
    );
  }

  if (session?.verified && !token) {
    redirect("/");
  }

  if (token) {
    const result = await verifyEmail(token);
    if (result.success) {
      const sessionAfterVerify = await getSession();
      if (sessionAfterVerify) {
        redirect("/");
      }
      return (
        <VerifyEmailResult
          status="success"
          message={result.success}
          showLoginOnly
        />
      );
    }
    return (
      <VerifyEmailResult
        status="error"
        message={result.error ?? "Something went wrong."}
      />
    );
  }

  if (!session) {
    redirect("/auth");
  }

  return <VerifyEmailResend email={session.email} />;
}
