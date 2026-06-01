import type { User } from "@supabase/supabase-js";

/** Mínimo do router do App Router usado para redirecionar ao login. */
export type LoginRouter = { push: (href: string) => void };

export async function requireUserClient(
  router: LoginRouter,
  getCurrentUser: () => Promise<User | null>
): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) {
    router.push("/login");
    return null;
  }
  return user;
}
