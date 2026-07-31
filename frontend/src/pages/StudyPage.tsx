import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { topicsApi } from "../api/topics";
import { ApiError } from "../api/client";
import type { Topic } from "../types/api";

// 주제마다 실제 카테고리 데이터가 있는 건 아니라서, 카드에 시각적인 구분만
// 주기 위해 순서대로 돌려 쓰는 장식용 아이콘.
const TOPIC_ICONS = ["💬", "📧", "🧑‍🤝‍🧑", "📊", "☕️", "📞"] as const;

export default function StudyPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    topicsApi
      .list()
      .then(setTopics)
      .catch((err) => setError(err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-gray-900">학습</h1>
      <p className="text-sm text-gray-500">주제를 선택하면 AI와 학습을 시작합니다.</p>

      {isLoading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic, index) => (
          <li key={topic.id}>
            <Link
              to={`/study/${topic.id}`}
              aria-label={topic.title}
              className="flex h-full flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <span aria-hidden="true" className="text-2xl">
                {TOPIC_ICONS[index % TOPIC_ICONS.length]}
              </span>
              <span aria-hidden="true" className="font-semibold text-gray-900">
                {topic.title}
              </span>
              <span aria-hidden="true" className="text-sm text-gray-500">
                {topic.title_en}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
