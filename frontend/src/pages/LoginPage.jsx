import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../api/client.js';
import Button from '../components/Button.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');

    try {
      const result = await signIn(form);
      localStorage.setItem('accessToken', result.accessToken);
      navigate('/products');
    } catch (submitError) {
      setError(submitError.message);
      setStatus('error');
    }
  }

  return (
    <section className="auth-panel">
      <p className="eyebrow">Login</p>
      <h1>로그인</h1>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          이메일
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
        {error && <p className="helper-text error">{error}</p>}
        <Button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '로그인 중' : '로그인'}
        </Button>
      </form>
    </section>
  );
}
