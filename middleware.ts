import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(
  request: NextRequest
) {

  const pathname =
    request.nextUrl.pathname;

  /*
    PUBLIC ROUTES
  */

  const publicRoutes = [
    "/login",
  ];

  const isPublic =
    publicRoutes.some(
      (route) =>
        pathname.startsWith(route)
    );

  /*
    ALLOW NEXT INTERNALS
  */

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {

    return NextResponse.next();

  }

  /*
    CHECK FOR SUPABASE AUTH COOKIE
  */

  const hasSession =
    request.cookies
      .getAll()
      .some((cookie) =>
        cookie.name.includes("sb-")
      );

  /*
    NOT LOGGED IN
  */

  if (
    !hasSession &&
    !isPublic
  ) {

    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );

  }

  /*
    ALREADY LOGGED IN
  */

  if (
    hasSession &&
    pathname === "/login"
  ) {

    return NextResponse.redirect(
      new URL(
        "/",
        request.url
      )
    );

  }

  return NextResponse.next();

}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
