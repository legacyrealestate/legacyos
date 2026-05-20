import { NextResponse } from "next/server";

export function middleware(request: Request) {

  const url =
    new URL(request.url);

  /*
    ALLOW LOGIN PAGE
  */

  if (
    url.pathname === "/login"
  ) {

    return NextResponse.next();

  }

  /*
    EVERYTHING ELSE
  */

  return NextResponse.redirect(
    new URL(
      "/login",
      request.url
    )
  );

}
