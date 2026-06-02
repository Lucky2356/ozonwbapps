import { describe, it, expect, vi } from 'vitest';
import { TrackedService } from './tracked.service';

// Лёгкие моки PrismaService и очереди — без поднятия Nest и БД.
function makeService(tracked: any[] = []) {
  const store = [...tracked];
  const prisma: any = {
    trackedProduct: {
      findFirst: vi.fn(async ({ where }: any) =>
        store.find((t) => t.id === where.id && t.userId === where.userId) ?? null,
      ),
      update: vi.fn(async ({ where, data }: any) => {
        const t = store.find((x) => x.id === where.id);
        Object.assign(t, data);
        return t;
      }),
    },
  };
  const queue: any = { add: vi.fn(async () => undefined) };
  return { service: new TrackedService(prisma, queue), queue };
}

describe('TrackedService.updateTarget', () => {
  it('обновляет целевую цену своего товара', async () => {
    const { service } = makeService([{ id: 't1', userId: 'u1', targetPrice: null }]);
    const res = await service.updateTarget('u1', 't1', { targetPrice: 999 });
    expect(res.targetPrice).toBe(999);
  });

  it('сбрасывает цель при отсутствии значения', async () => {
    const { service } = makeService([{ id: 't1', userId: 'u1', targetPrice: 999 }]);
    const res = await service.updateTarget('u1', 't1', {});
    expect(res.targetPrice).toBeNull();
  });

  it('не даёт менять чужой товар', async () => {
    const { service } = makeService([{ id: 't1', userId: 'u1', targetPrice: null }]);
    await expect(service.updateTarget('other', 't1', { targetPrice: 100 })).rejects.toThrow();
  });
});

describe('TrackedService.requestCheck', () => {
  it('ставит задачу в очередь для своего товара', async () => {
    const { service, queue } = makeService([{ id: 't1', userId: 'u1' }]);
    const res = await service.requestCheck('u1', 't1');
    expect(res.queued).toBe(true);
    expect(queue.add).toHaveBeenCalledWith('price-check', { trackedProductId: 't1' });
  });

  it('бросает для чужого/несуществующего товара', async () => {
    const { service } = makeService([]);
    await expect(service.requestCheck('u1', 'missing')).rejects.toThrow();
  });
});
