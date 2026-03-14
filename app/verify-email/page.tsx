import { verifyEmail } from "@/app/actions/auth";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  VerifyEmailResult,
  VerifyEmailResend,
  VerifyEmailLoggedInPopup,
} from "@/components/verify-email";

function renderTokenResult(
  result: { success: string; email?: string } | { error: string },
  session: { email?: string } | null,
) {
  if ("error" in result) {
    return (
      <VerifyEmailResult
        status="error"
        message={result.error ?? "Something went wrong."}
      />
    );
  }
  const verifiedEmail = result.email?.toLowerCase()?.trim();
  const currentEmail = session?.email?.toLowerCase()?.trim();
  const hasSession = Boolean(currentEmail);
  const isSameUser =
    hasSession &&
    verifiedEmail !== undefined &&
    verifiedEmail !== "" &&
    currentEmail === verifiedEmail;
  const isDifferentUser =
    hasSession && verifiedEmail !== undefined && currentEmail !== verifiedEmail;

  // Cookie stored but different user than the one being verified → Close popup
  if (isDifferentUser) {
    return (
      <VerifyEmailLoggedInPopup
        success
        message={result.success}
        email={verifiedEmail}
      />
    );
  }
  // Cookie stored and same user just verified → Go to dashboard
  if (isSameUser) {
    return (
      <VerifyEmailResult
        status="success"
        message={result.success}
        showLoginOnly={false}
      />
    );
  }
  // No cookie (unauthenticated) → Go to login
  return (
    <VerifyEmailResult
      status="success"
      message={result.success}
      showLoginOnly
    />
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ token?: string; email?: string }>;
}>) {
  const { token } = await searchParams;
  const session = await getSession();

  if (token) {
    const result = await verifyEmail(token);
    return renderTokenResult(result, session);
  }

  if (session?.verified) redirect("/");
  if (session && !session.verified) {
    return <VerifyEmailResend email={session.email} />;
  }
  redirect("/auth");
}
