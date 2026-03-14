import { type NextRequest, NextResponse, type NextProxy } from "next/server";
import {
  validateSessionToken,
  encodeSessionHeader,
  SESSION_PAYLOAD_HEADER,
} from "@/lib/session";

function redirectToAuth(req: NextRequest, clearCookie = false) {
  const res = NextResponse.redirect(new URL("/auth", req.url));
  if (clearCookie) {
    res.cookies.delete("session_token");
  }
  return res;
}

const isVerifyPath = (pathname: string) =>
  pathname === "/verify" || pathname === "/verify-email";

const proxy: NextProxy = async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const sessionToken = req.cookies.get("session_token")?.value;
  const isAuthPage = pathname === "/auth";
  const isVerify = isVerifyPath(pathname);

  if (!sessionToken) {
    if (isAuthPage || isVerify) return NextResponse.next();
    return redirectToAuth(req);
  }

  const session = await validateSessionToken(sessionToken);

  if (!session) {
    if (isAuthPage) {
      const res = NextResponse.next();
      res.cookies.delete("session_token");
      return res;
    }
    if (isVerify) {
      const res = NextResponse.next();
      res.cookies.delete("session_token");
      return res;
    }
    return redirectToAuth(req, true);
  }

  const headers = new Headers(req.headers);
  headers.set(SESSION_PAYLOAD_HEADER, encodeSessionHeader(session));

  if (isAuthPage) {
    if (session.verified) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  if (!session.verified && !isVerify) {
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  return NextResponse.next({ request: { headers } });
};

export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};