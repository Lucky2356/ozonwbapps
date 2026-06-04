import { describe, it, expect } from 'vitest';
import { isStale } from './cache-policy';

describe('isStale (stale-while-revalidate)', () => {
  it('свежая запись (моложе мягкого TTL) не требует обновления', () => {
    expect(isStale(10_000, 300)).toBe(false); // 10с < 300с
  });

  it('запись старше мягкого TTL требует фонового обновления', () => {
    expect(isStale(400_000, 300)).toBe(true); // 400с > 300с
  });

  it('граница: ровно на TTL ещё свежая', () => {
    expect(isStale(300_000, 300)).toBe(false);
    expect(isStale(300_001, 300)).toBe(true);
  });
});
