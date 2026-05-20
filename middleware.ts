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
    GET COOKIES
  */

  const cookies =
    request.headers.get("cookie") || "";

  /*
    CHECK AUTH SESSION
  */

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
    PROTECTED ROUTES
  */

  if (!isLoggedIn) {

    return NextResponse.redirect(
      new URL("/login", request.url)
    );

  }

  return NextResponse.next();

}
