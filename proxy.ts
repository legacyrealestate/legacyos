import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { PUBLIC_API_ROUTES, PUBLIC_PAGE_ROUTES } from "@/lib/security/public-routes";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function isPublic(pathname: string) {
  const isStaticAsset =
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.(?:ico|png|jpg|jpeg|gif|svg|webp|css|js|map|txt|xml|woff2?)$/i.test(pathname);

  return (
    PUBLIC_PAGE_ROUTES.has(pathname) ||
    PUBLIC_API_ROUTES.has(pathname) ||
    isStaticAsset
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublic(pathname) || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login?error=configuration", request.url));
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
