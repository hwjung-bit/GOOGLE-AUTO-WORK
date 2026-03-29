import { prisma } from "@google-auto-work/db";
import { requireSession } from "@/lib/session";
import DashboardStats from "@/components/dashboard/DashboardStats";
import RecentExecutions from "@/components/dashboard/RecentExecutions";
import ActiveRules from "@/components/dashboard/ActiveRules";

export default async function DashboardPage() {
  const { userId } = await requireSession();

  const [totalRules, activeRules, totalExecutions, recentLogs] = await Promise.all([
    prisma.automationRule.count({ where: { userId } }),
    prisma.automationRule.count({ where: { userId, isActive: true } }),
    prisma.executionLog.count({ where: { userId } }),
    prisma.executionLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const successCount = await prisma.executionLog.count({
    where: { userId, status: "SUCCESS" },
  });

  const stats = {
    totalRules,
    activeRules,
    totalExecutions,
    successRate: totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-1 text-sm text-gray-500">
          자동화 작업 현황을 한눈에 확인하세요
        </p>
      </div>

      <DashboardStats stats={stats} />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentExecutions logs={recentLogs} />
        <ActiveRules userId={userId} />
      </div>
    </div>
  );
}
