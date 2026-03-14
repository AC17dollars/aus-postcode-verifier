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
  const { token } = await searchParams;
  const session = await getSession();

  if (token) {
    const result = await verifyEmail(token);
    if (result.success) {
      const sessionAfterVerify = await getSession();
      if (sessionAfterVerify?.verified) {
        return (
          <VerifyEmailLoggedInPopup
            success
            message={result.success}
            email={"email" in result ? result.email : undefined}
          />
        );
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

  if (session?.verified) {
    redirect("/");
  }

  if (session && !session.verified) {
    return <VerifyEmailResend email={session.email} />;
  }

  redirect("/auth");
}
