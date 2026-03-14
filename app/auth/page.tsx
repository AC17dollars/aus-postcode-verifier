import { LoginUI } from "@/components/login-ui";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getSession();

  if (session?.verified) {
    redirect("/");
  }

  if (session && !session.verified) {
    redirect("/verify-email");
  }

  return <LoginUI />;
}
