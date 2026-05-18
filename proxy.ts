import { NextResponse } from "next/server";

export function proxy(req: any) {

  const hasSupabaseCookie =
    req.cookies
      .getAll()
      .some((cookie: any) =>
        cookie.name.includes("sb-")
      );

  const isLoginPage =
    req.nextUrl.pathname ===
    "/login";

  if (
    !hasSupabaseCookie &&
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
    hasSupabaseCookie &&
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
