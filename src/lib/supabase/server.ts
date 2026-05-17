import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                // SameSite=Lax (Supabase default) is required for OAuth redirects.
                // Strict blocks the code-verifier cookie on cross-site navigations.
              })
            );
          } catch {
            // Called from a Server Component — cookies can't be set, middleware handles refresh
          }
        },
      },
    }
  );
}
