import { prisma } from "@google-auto-work/db";
import Link from "next/link";
import { ToggleRight, ChevronRight } from "lucide-react";

export default async function ActiveRules({ userId }: { userId: string }) {
  const rules = await prisma.automationRule.findMany({
    where: { userId, isActive: true },
    orderBy: { priority: "asc" },
    take: 5,
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">활성 자동화 규칙</h2>
        <Link
          href="/dashboard/rules"
          className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          전체 보기 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {rules.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 mb-3">활성 규칙이 없습니다</p>
          <Link
            href="/dashboard/rules"
            className="text-sm text-primary-600 hover:underline"
          >
            첫 번째 규칙 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-3">
              <ToggleRight className="w-4 h-4 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{rule.name}</p>
                {rule.description && (
                  <p className="text-xs text-gray-400 truncate">{rule.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
