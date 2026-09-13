import { redirect } from "next/navigation";
import { currentUser, isOwner } from "@/lib/auth";
import { effectiveMode } from "@/lib/research";
import { Workspace } from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/signin?returnTo=/app");
  return (
    <Workspace
      account={{
        email: user.email,
        owner: isOwner(user.email),
        mode: effectiveMode(user),
      }}
    />
  );
}
