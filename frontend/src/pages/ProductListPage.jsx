import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../api/client.js';
import Card from '../components/Card.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchToolbar from '../components/SearchToolbar.jsx';

const LIMIT = 8;

export default function ProductListPage() {
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
    getProducts(params)
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
          <p className="eyebrow">Products</p>
          <h1>상품 목록</h1>
        </div>
        <Link className="text-link" to="/products/new">
          상품 등록
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

      {status === 'loading' && <p className="state-text">상품을 불러오는 중입니다.</p>}
      {status === 'error' && <p className="state-text error">{error}</p>}
      {status === 'success' && data.list.length === 0 && (
        <p className="state-text">등록된 상품이 없습니다.</p>
      )}

      <div className="item-grid">
        {data.list.map((product) => (
          <Card key={product.id}>
            <Link to={`/products/${product.id}`} className="card-link">
              <div className="image-frame">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} />
                ) : (
                  <span>이미지 없음</span>
                )}
              </div>
              <h2>{product.name}</h2>
              <p>{product.price.toLocaleString()}원</p>
              <small>좋아요 {product.likeCount}</small>
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
