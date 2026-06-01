import { describe, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service';

// Лёгкие моки PrismaService и JwtService — без поднятия Nest и БД.
function makeService(users: any[] = []) {
  const store = [...users];
  const prisma: any = {
    user: {
      findUnique: vi.fn(async ({ where }: any) =>
        store.find((u) => u.email === where.email || u.id === where.id) ?? null,
      ),
      create: vi.fn(async ({ data }: any) => {
        const user = { id: 'u_' + (store.length + 1), ...data };
        store.push(user);
        return user;
      }),
    },
  };
  const jwt: any = { sign: vi.fn(() => 'fake.jwt.token') };
  return new AuthService(prisma, jwt);
}

describe('AuthService', () => {
  it('регистрирует нового пользователя и выдаёт токен', async () => {
    const service = makeService();
    const res = await service.register({ email: 'a@b.com', password: 'secret123' });
    expect(res.token).toBe('fake.jwt.token');
    expect(res.user.email).toBe('a@b.com');
  });

  it('не даёт зарегистрировать существующий email', async () => {
    const service = makeService([{ id: 'u1', email: 'a@b.com', passwordHash: 'x' }]);
    await expect(service.register({ email: 'a@b.com', password: 'secret123' })).rejects.toThrow();
  });

  it('логинит с верным паролем', async () => {
    const service = makeService();
    await service.register({ email: 'c@d.com', password: 'secret123' });
    const res = await service.login({ email: 'c@d.com', password: 'secret123' });
    expect(res.token).toBe('fake.jwt.token');
  });

  it('отклоняет неверный пароль', async () => {
    const service = makeService();
    await service.register({ email: 'e@f.com', password: 'secret123' });
    await expect(service.login({ email: 'e@f.com', password: 'wrong' })).rejects.toThrow();
  });
});
