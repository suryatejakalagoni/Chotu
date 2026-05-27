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
              // Use Supabase's options as-is (SameSite=Lax, Secure in prod).
              // Do NOT add httpOnly:true — createBrowserClient uses document.cookie and
              // must be able to read/write the same tokens. httpOnly would cause a
              // cookie name collision and break the OTP session handoff.
              cookieStore.set(name, value, {
                ...options,
                secure: process.env.NODE_ENV === "production",
              })
            );
          } catch {
            // Server Component context — middleware handles refresh
          }
        },
      },
    }
  );
}
