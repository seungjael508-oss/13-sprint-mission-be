import { useParams } from 'react-router-dom';

export default function ArticleDetailPage() {
  const { articleId } = useParams();

  return (
    <section className="page-stack">
      <p className="eyebrow">Article Detail</p>
      <h1>게시글 상세</h1>
      <p className="state-text">게시글 상세 API 연결 대기 중입니다. ID: {articleId}</p>
    </section>
  );
}
