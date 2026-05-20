import { createMiddlewareClient }
from "@supabase/auth-helpers-nextjs";

import { NextResponse }
from "next/server";

import type { NextRequest }
from "next/server";

export async function middleware(
  req: NextRequest
) {

  const res =
    NextResponse.next();

  const supabase =
    createMiddlewareClient({
      req,
      res,
    });

  const {
    data: { session },
  } =
    await supabase.auth.getSession();

  const pathname =
    req.nextUrl.pathname;

  /*
    PUBLIC ROUTES
  */

  const publicRoutes = [
    "/login",
  ];

  const isPublic =
    publicRoutes.includes(pathname);

  /*
    ALLOW INTERNALS
  */

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {

    return res;

  }

  /*
    REDIRECT UNAUTH USERS
  */

  if (
    !session &&
    !isPublic
  ) {

    return NextResponse.redirect(
      new URL(
        "/login",
        req.url
      )
    );

  }

  /*
    REDIRECT LOGGED USERS
  */

  if (
    session &&
    pathname === "/login"
  ) {

    return NextResponse.redirect(
      new URL(
        "/",
        req.url
      )
    );

  }

  return res;

}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
