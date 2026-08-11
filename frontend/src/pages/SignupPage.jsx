import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp } from '../api/client.js';
import Button from '../components/Button.jsx';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    nickname: '',
    password: '',
    passwordConfirmation: '',
  });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');

    try {
      const result = await signUp(form);
      localStorage.setItem('accessToken', result.accessToken);
      navigate('/products');
    } catch (submitError) {
      setError(submitError.message);
      setStatus('error');
    }
  }

  return (
    <section className="auth-panel">
      <p className="eyebrow">Sign Up</p>
      <h1>회원가입</h1>
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
          닉네임
          <input
            type="text"
            name="nickname"
            value={form.nickname}
            onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
        <label>
          비밀번호 확인
          <input
            type="password"
            name="passwordConfirmation"
            autoComplete="new-password"
            value={form.passwordConfirmation}
            onChange={(event) =>
              setForm((current) => ({ ...current, passwordConfirmation: event.target.value }))
            }
          />
        </label>
        {error && <p className="helper-text error">{error}</p>}
        <Button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '가입 중' : '가입하기'}
        </Button>
      </form>
    </section>
  );
}
