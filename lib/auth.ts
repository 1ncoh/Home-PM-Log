import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUserId() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await prisma.user.upsert({
    where: { id: user.id },
    update: {},
    create: { id: user.id },
  });

  return user.id;
}
