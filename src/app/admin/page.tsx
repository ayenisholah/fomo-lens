import { redirect } from "next/navigation";
import { currentUser, isOwner } from "@/lib/auth";
import { Admin } from "@/components/admin";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/signin?returnTo=/admin");
  if (!isOwner(user.email)) redirect("/app");
  return <Admin />;
}
