import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../store/auth';

interface Props {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: Props) {
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const { data } = await api.post(endpoint, { email, password });
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Ошибка. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-7">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Sparkles className="h-10 w-10 text-brand" />
          <h1 className="text-2xl font-extrabold">Выгодные предложения</h1>
          <p className="text-sm text-slate-500">
            {isLogin ? 'Войдите, чтобы искать выгодные товары' : 'Создайте аккаунт за минуту'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input
              className="input"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Подождите…' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {isLogin ? (
            <>
              Нет аккаунта?{' '}
              <Link to="/register" className="font-semibold text-brand">
                Регистрация
              </Link>
            </>
          ) : (
            <>
              Уже есть аккаунт?{' '}
              <Link to="/login" className="font-semibold text-brand">
                Войти
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
