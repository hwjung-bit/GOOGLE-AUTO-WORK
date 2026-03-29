import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Sidebar from "@/components/shared/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userName={session.name ?? session.email ?? "사용자"} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
