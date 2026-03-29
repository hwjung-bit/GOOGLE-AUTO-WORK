import { prisma } from "@google-auto-work/db";
import { requireSession } from "@/lib/session";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_CONFIG = {
  SUCCESS: { icon: CheckCircle, className: "text-green-500", label: "성공" },
  PARTIAL: { icon: AlertCircle, className: "text-yellow-500", label: "부분 성공" },
  FAILED: { icon: XCircle, className: "text-red-500", label: "실패" },
  SKIPPED: { icon: Clock, className: "text-gray-400", label: "건너뜀" },
};

export default async function HistoryPage() {
  const { userId } = await requireSession();
  const logs = await prisma.executionLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">실행 이력</h1>
        <p className="mt-1 text-sm text-gray-500">자동화 작업의 처리 결과를 확인하세요</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">실행 이력이 없습니다</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const config = STATUS_CONFIG[log.status];
              const Icon = config.icon;
              return (
                <div key={log.id} className="flex items-start gap-4 p-4">
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.className}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {log.emailSubject ?? "이메일 처리"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.emailFrom && <span className="mr-3">{log.emailFrom}</span>}
                      {formatRelativeTime(log.createdAt)}
                      {log.durationMs && (
                        <span className="ml-3">{log.durationMs}ms</span>
                      )}
                    </p>
                    {log.errorMessage && (
                      <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${config.className}`}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
