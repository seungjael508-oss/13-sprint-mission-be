import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArticle } from '../api/client.js';
import Button from '../components/Button.jsx';
import ImageUploader from '../components/ImageUploader.jsx';

export default function ArticleFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    content: '',
    image: '',
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
      const article = await createArticle({
        title: form.title,
        content: form.content,
        image: form.image || null,
      });
      navigate(`/articles/${article.id}`);
    } catch (submitError) {
      setError(submitError.message);
      setStatus('error');
    }
  }

  return (
    <section className="auth-panel form-panel">
      <p className="eyebrow">New Article</p>
      <h1>게시글 작성</h1>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          제목
          <input value={form.title} onChange={(event) => updateField('title', event.target.value)} />
        </label>
        <label>
          내용
          <textarea value={form.content} onChange={(event) => updateField('content', event.target.value)} />
        </label>
        <ImageUploader label="게시글 이미지" onUploaded={(imageUrl) => updateField('image', imageUrl)} />
        {error && <p className="helper-text error">{error}</p>}
        <Button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '작성 중' : '게시글 작성'}
        </Button>
      </form>
    </section>
  );
}
