import { ExecutionLog } from "@google-auto-work/db";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const STATUS_CONFIG = {
  SUCCESS: { icon: CheckCircle, className: "text-green-500", label: "성공" },
  PARTIAL: { icon: AlertCircle, className: "text-yellow-500", label: "부분 성공" },
  FAILED: { icon: XCircle, className: "text-red-500", label: "실패" },
  SKIPPED: { icon: Clock, className: "text-gray-400", label: "건너뜀" },
};

export default function RecentExecutions({ logs }: { logs: ExecutionLog[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">최근 실행 이력</h2>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">실행 이력이 없습니다</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const config = STATUS_CONFIG[log.status];
            const Icon = config.icon;
            return (
              <div key={log.id} className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.className}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {log.emailSubject ?? "이메일 처리"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {log.emailFrom && <span className="mr-2">{log.emailFrom}</span>}
                    {formatRelativeTime(log.createdAt)}
                    {log.durationMs && (
                      <span className="ml-2">{log.durationMs}ms</span>
                    )}
                  </p>
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
  );
}
