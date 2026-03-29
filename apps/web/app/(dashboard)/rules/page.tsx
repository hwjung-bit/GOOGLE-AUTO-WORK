import { prisma } from "@google-auto-work/db";
import { requireSession } from "@/lib/session";
import Link from "next/link";
import { Plus, ToggleLeft, ToggleRight } from "lucide-react";

export default async function RulesPage() {
  const { userId } = await requireSession();
  const rules = await prisma.automationRule.findMany({
    where: { userId },
    orderBy: { priority: "asc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">자동화 규칙</h1>
          <p className="mt-1 text-sm text-gray-500">
            조건에 따라 이메일을 자동으로 분류, 보관, 답장 생성합니다
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          새 규칙 만들기
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">아직 규칙이 없습니다</p>
          <p className="text-sm text-gray-400">
            새 규칙을 만들어 이메일 자동화를 시작하세요
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{rule.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      rule.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {rule.isActive ? "활성" : "비활성"}
                  </span>
                </div>
                {rule.description && (
                  <p className="text-sm text-gray-400 mt-1">{rule.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {rule.isActive ? (
                  <ToggleRight className="w-5 h-5 text-green-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
