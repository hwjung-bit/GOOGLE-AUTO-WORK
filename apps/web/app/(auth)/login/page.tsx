import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  no_code: "인증 코드를 받지 못했습니다.",
  auth_failed: "인증에 실패했습니다. 다시 시도해주세요.",
  state_mismatch: "보안 검증에 실패했습니다. 다시 시도해주세요.",
  access_denied: "접근이 거부되었습니다.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  if (session.userId) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Google Workspace 자동화 어시스턴트
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Gmail, Drive, Calendar를 AI로 자동화하세요
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {ERROR_MESSAGES[error] ?? "오류가 발생했습니다."}
          </div>
        )}

        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-300 transition-all duration-200 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google 계정으로 시작하기
        </a>

        <p className="mt-6 text-xs text-center text-gray-400">
          로그인 시 Gmail, Drive, Calendar 접근에 동의하게 됩니다.
          <br />
          최소한의 권한만 요청하며, 언제든지 철회할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
