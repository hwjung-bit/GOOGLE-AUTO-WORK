export default function DocumentsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">문서 검색 및 요약</h1>
        <p className="mt-1 text-sm text-gray-500">
          이메일 내용 기반으로 Google Drive 문서를 검색하고 요약합니다
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="검색어를 입력하세요..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <button className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
            검색
          </button>
        </div>
        <p className="text-sm text-gray-400 text-center py-12">
          검색어를 입력하면 Google Drive에서 관련 문서를 찾아 요약합니다
        </p>
      </div>
    </div>
  );
}
