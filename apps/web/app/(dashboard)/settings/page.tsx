import { requireSession } from "@/lib/session";
import { prisma } from "@google-auto-work/db";
import { Shield, Key, Trash2 } from "lucide-react";

export default async function SettingsPage() {
  const { userId, email, name } = await requireSession();
  const token = await prisma.oAuthToken.findUnique({ where: { userId } });

  const scopes = token?.scope.split(" ") ?? [];
  const scopeLabels: Record<string, string> = {
    "https://www.googleapis.com/auth/gmail.modify": "Gmail 읽기 및 수정",
    "https://www.googleapis.com/auth/gmail.compose": "Gmail 초안 생성",
    "https://www.googleapis.com/auth/drive.readonly": "Google Drive 읽기",
    "https://www.googleapis.com/auth/calendar.events": "Google Calendar 이벤트",
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">설정 및 권한 관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          Google 계정 연동 상태와 데이터 접근 권한을 관리합니다
        </p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-4 h-4" />
          계정 정보
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">이름</span>
            <span className="text-gray-900">{name ?? "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">이메일</span>
            <span className="text-gray-900">{email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">토큰 만료</span>
            <span className="text-gray-900">
              {token?.expiresAt
                ? new Date(token.expiresAt).toLocaleString("ko-KR")
                : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          부여된 권한
        </h2>
        <div className="space-y-2">
          {scopes.filter((s) => s.startsWith("https://")).map((scope) => (
            <div key={scope} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm text-gray-700">
                {scopeLabels[scope] ?? scope}
              </span>
            </div>
          ))}
          {scopes.filter((s) => s.startsWith("https://")).length === 0 && (
            <p className="text-sm text-gray-400">연동된 권한이 없습니다</p>
          )}
        </div>
      </div>

      {/* Revoke */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <h2 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          연동 해제
        </h2>
        <p className="text-sm text-red-700 mb-4">
          Google 계정 연동을 해제하면 모든 자동화 기능이 중단되고 저장된 인증 토큰이 삭제됩니다.
        </p>
        <form action="/api/auth/revoke" method="DELETE">
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            onClick={async (e) => {
              e.preventDefault();
              if (!confirm("정말로 연동을 해제하시겠습니까?")) return;
              await fetch("/api/auth/revoke", { method: "DELETE" });
              window.location.href = "/login";
            }}
          >
            Google 연동 해제
          </button>
        </form>
      </div>
    </div>
  );
}
