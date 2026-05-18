import { NextResponse } from "next/server";

export function proxy(
  req: any
) {

  const token =
    req.cookies.get(
      "sb-access-token"
    );

  const isLoginPage =
    req.nextUrl.pathname ===
    "/login";

  if (
    !token &&
    !isLoginPage
  ) {

    return NextResponse.redirect(
      new URL(
        "/login",
        req.url
      )
    );

  }

  if (
    token &&
    isLoginPage
  ) {

    return NextResponse.redirect(
      new URL(
        "/",
        req.url
      )
    );

  }

  return NextResponse.next();
}

export const config = {
  matcher: [

    "/",

    "/calls",

    "/maintenance",

    "/leasing",

    "/operations",

    "/vendors",

    "/properties",

    "/email",

    "/contacts",

    "/integrations",

    "/settings",

    "/command",

    "/login",

  ],
};