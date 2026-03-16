import { type NextRequest, NextResponse, type NextProxy } from "next/server";
import {
  validateSessionToken,
  encodeSessionHeader,
  SESSION_PAYLOAD_HEADER,
} from "@/lib/session";
import { env } from "@/lib/env";

function redirectToAuth(req: NextRequest, clearCookie = false) {
  const res = NextResponse.redirect(new URL("/auth", req.url));
  if (clearCookie) {
    res.cookies.delete("session_token");
  }
  return res;
}

const isTestRoute = (pathname: string) => pathname.startsWith("/api/test/");

async function handleRequest(
  req: NextRequest,
  { allowTestRoutes = false }: { allowTestRoutes?: boolean } = {},
) {
  const { pathname } = req.nextUrl;

  if (allowTestRoutes && isTestRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get("session_token")?.value;
  const isAuthPage = pathname === "/auth";
  const isVerifyEmailPage = pathname === "/verify-email";

  if (!sessionToken) {
    if (isAuthPage || isVerifyEmailPage) return NextResponse.next();
    return redirectToAuth(req);
  }

  const session = await validateSessionToken(sessionToken);

  if (!session) {
    if (isAuthPage || isVerifyEmailPage) {
      const res = NextResponse.next();
      res.cookies.delete("session_token");
      return res;
    }
    return redirectToAuth(req, true);
  }

  const headers = new Headers(req.headers);
  headers.set(SESSION_PAYLOAD_HEADER, encodeSessionHeader(session));

  if (isAuthPage) {
    if (session.verified) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  if (!session.verified && !isVerifyEmailPage) {
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  const isLogsPage = pathname === "/logs";
  if (isLogsPage && !session.admin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next({ request: { headers } });
}

const proxy: NextProxy = async (req: NextRequest) => handleRequest(req);

const handler =
  env.ALLOW_TEST_ROUTES === "true"
    ? (async function testProxy(req: NextRequest) {
        return handleRequest(req, { allowTestRoutes: true });
      }) as NextProxy
    : proxy;

export default handler;

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
