export default function EmailsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">이메일 초안 생성</h1>
        <p className="mt-1 text-sm text-gray-500">
          수신된 이메일을 선택하면 AI가 3가지 스타일의 답장 초안을 생성합니다
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-400 text-center py-12">
          이메일 목록을 불러오는 중...
        </p>
      </div>
    </div>
  );
}
