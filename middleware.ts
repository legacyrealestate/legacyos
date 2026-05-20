import { NextResponse } from "next/server";

export function middleware(request: Request) {

  const url =
    new URL(request.url);

  const pathname =
    url.pathname;

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
    ALLOW LOGIN
  */

  if (
    pathname === "/login"
  ) {

    return NextResponse.next();

  }

  /*
    REDIRECT EVERYTHING ELSE
  */

  return NextResponse.redirect(
    new URL(
      "/login",
      request.url
    )
  );

}
