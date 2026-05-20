import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {

  const pathname =
    request.nextUrl.pathname;

  /*
    ALLOW API ROUTES
    (VERY IMPORTANT FOR WEBHOOKS)
  */

  if (
    pathname.startsWith("/api")
  ) {

    return NextResponse.next();

  }

  /*
    ALLOW STATIC FILES
  */

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {

    return NextResponse.next();

  }

  /*
    GET COOKIES
  */

  const cookies =
    request.headers.get("cookie") || "";

  const isLoggedIn =
    cookies.includes("auth-token");

  /*
    LOGIN PAGE
  */

  if (
    pathname === "/login"
  ) {

    if (isLoggedIn) {

      return NextResponse.redirect(
        new URL("/", request.url)
      );

    }

    return NextResponse.next();

  }

  /*
    PROTECT DASHBOARD PAGES
  */

  if (!isLoggedIn) {

    return NextResponse.redirect(
      new URL("/login", request.url)
    );

  }

  return NextResponse.next();

}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
