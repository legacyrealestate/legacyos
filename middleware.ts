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
    CHECK AUTH COOKIE
  */

  const hasAuth =
    request.headers
      .get("cookie")
      ?.includes("sb-");

  /*
    ALLOW LOGIN PAGE
  */

  if (
    pathname === "/login"
  ) {

    /*
      already logged in
    */

    if (hasAuth) {

      return NextResponse.redirect(
        new URL(
          "/",
          request.url
        )
      );

    }

    return NextResponse.next();

  }

  /*
    NOT LOGGED IN
  */

  if (!hasAuth) {

    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );

  }

  return NextResponse.next();

}
