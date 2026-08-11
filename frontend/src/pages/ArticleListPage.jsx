import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArticles } from '../api/client.js';
import Card from '../components/Card.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchToolbar from '../components/SearchToolbar.jsx';

const LIMIT = 8;

export default function ArticleListPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [orderBy, setOrderBy] = useState('recent');
  const [data, setData] = useState({ list: [], totalCount: 0 });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const nextParams = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
    });

    if (appliedKeyword) nextParams.set('keyword', appliedKeyword);
    if (orderBy !== 'recent') nextParams.set('orderBy', orderBy);

    return nextParams;
  }, [appliedKeyword, orderBy, page]);

  useEffect(() => {
    setStatus('loading');
    getArticles(params)
      .then((result) => {
        setData(result);
        setError('');
        setStatus('success');
      })
      .catch((requestError) => {
        setError(requestError.message);
        setStatus('error');
      });
  }, [params]);

  function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setAppliedKeyword(keyword.trim());
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Articles</p>
          <h1>자유게시판</h1>
        </div>
        <Link className="text-link" to="/articles/new">
          게시글 작성
        </Link>
      </div>

      <SearchToolbar
        keyword={keyword}
        orderBy={orderBy}
        onKeywordChange={setKeyword}
        onOrderByChange={(value) => {
          setOrderBy(value);
          setPage(1);
        }}
        onSubmit={handleSearch}
      />

      {status === 'loading' && <p className="state-text">게시글을 불러오는 중입니다.</p>}
      {status === 'error' && <p className="state-text error">{error}</p>}
      {status === 'success' && data.list.length === 0 && (
        <p className="state-text">등록된 게시글이 없습니다.</p>
      )}

      <div className="list-stack">
        {data.list.map((article) => (
          <Card key={article.id}>
            <Link to={`/articles/${article.id}`} className="article-row">
              <div>
                <h2>{article.title}</h2>
                <p>{article.content}</p>
              </div>
              <small>좋아요 {article.likeCount}</small>
            </Link>
          </Card>
        ))}
      </div>

      <Pagination
        page={page}
        limit={LIMIT}
        totalCount={data.totalCount}
        onPageChange={setPage}
      />
    </section>
  );
}
