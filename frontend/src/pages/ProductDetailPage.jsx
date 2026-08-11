import { useParams } from 'react-router-dom';

export default function ProductDetailPage() {
  const { productId } = useParams();

  return (
    <section className="page-stack">
      <p className="eyebrow">Product Detail</p>
      <h1>상품 상세</h1>
      <p className="state-text">상품 상세 API 연결 대기 중입니다. ID: {productId}</p>
    </section>
  );
}
