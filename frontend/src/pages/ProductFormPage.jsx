import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../api/client.js';
import Button from '../components/Button.jsx';
import ImageUploader from '../components/ImageUploader.jsx';

export default function ProductFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    tags: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');

    try {
      const product = await createProduct({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        imageUrl: form.imageUrl || null,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      navigate(`/products/${product.id}`);
    } catch (submitError) {
      setError(submitError.message);
      setStatus('error');
    }
  }

  return (
    <section className="auth-panel form-panel">
      <p className="eyebrow">New Product</p>
      <h1>상품 등록</h1>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          상품명
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
        </label>
        <label>
          설명
          <textarea value={form.description} onChange={(event) => updateField('description', event.target.value)} />
        </label>
        <label>
          가격
          <input
            type="number"
            min="0"
            value={form.price}
            onChange={(event) => updateField('price', event.target.value)}
          />
        </label>
        <label>
          태그
          <input
            placeholder="쉼표로 구분"
            value={form.tags}
            onChange={(event) => updateField('tags', event.target.value)}
          />
        </label>
        <ImageUploader label="상품 이미지" onUploaded={(imageUrl) => updateField('imageUrl', imageUrl)} />
        {error && <p className="helper-text error">{error}</p>}
        <Button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '등록 중' : '상품 등록'}
        </Button>
      </form>
    </section>
  );
}
