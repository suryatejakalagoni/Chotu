import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/assignments",
  "/exams",
  "/expenses",
  "/community",
];

const AUTH_ROUTES = ["/login", "/signup"];

export default async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              // SameSite=Lax required — Strict breaks OAuth cross-site redirects.
            })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_ROUTES.some((route) =>
    path.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => path === route);

  // Not logged in → send to login
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in but email not verified → send to verify-email
  if (isProtected && user && !user.email_confirmed_at) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  // Already logged in and verified → skip auth pages
  if (isAuthRoute && user && user.email_confirmed_at) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
