import { prisma } from "@google-auto-work/db";
import { requireSession } from "@/lib/session";
import { Zap, Clock, Mail, Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

const TRIGGER_TYPE_LABEL = {
  NEW_EMAIL: { label: "새 이메일 수신", icon: Mail },
  SCHEDULED: { label: "정기 스케줄", icon: Clock },
  MANUAL: { label: "수동 실행", icon: Zap },
};

export default async function TriggersPage() {
  const { userId } = await requireSession();
  const triggers = await prisma.automationTrigger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">트리거 설정</h1>
          <p className="mt-1 text-sm text-gray-500">
            자동화 작업이 실행될 시점을 설정합니다
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          새 트리거 추가
        </button>
      </div>

      {triggers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-2">트리거가 없습니다</p>
          <p className="text-sm text-gray-400">
            트리거를 추가하면 자동화가 시작됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {triggers.map((trigger) => {
            const typeConfig = TRIGGER_TYPE_LABEL[trigger.triggerType];
            const Icon = typeConfig.icon;
            return (
              <div key={trigger.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{trigger.name}</p>
                    <p className="text-xs text-gray-400">
                      {typeConfig.label}
                      {trigger.cronExpr && (
                        <span className="ml-2 font-mono">{trigger.cronExpr}</span>
                      )}
                      {trigger.lastFiredAt && (
                        <span className="ml-2">
                          마지막 실행: {formatRelativeTime(trigger.lastFiredAt)}
                        </span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      trigger.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {trigger.isActive ? "활성" : "비활성"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
