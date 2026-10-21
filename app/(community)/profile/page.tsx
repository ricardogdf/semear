import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/http/current-user";

/** "Meu perfil": leva ao endereço público e estável do perfil do usuário da sessão. */
export default async function MyProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=%2Fprofile");
  }
  redirect(`/profile/${user.id}`);
}
