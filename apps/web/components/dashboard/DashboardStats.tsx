import { BookOpen, CheckCircle, PlayCircle, TrendingUp } from "lucide-react";

interface Stats {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successRate: number;
}

export default function DashboardStats({ stats }: { stats: Stats }) {
  const cards = [
    {
      label: "전체 규칙",
      value: stats.totalRules,
      icon: BookOpen,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "활성 규칙",
      value: stats.activeRules,
      icon: PlayCircle,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "총 실행 횟수",
      value: stats.totalExecutions.toLocaleString(),
      icon: CheckCircle,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "성공률",
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: "text-orange-600 bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}
