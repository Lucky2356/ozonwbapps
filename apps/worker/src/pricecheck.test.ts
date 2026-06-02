import { describe, it, expect } from 'vitest';
import { decideNotification } from './pricecheck';

describe('decideNotification', () => {
  describe('с целевой ценой', () => {
    it('уведомляет при первом пересечении цели сверху вниз', () => {
      expect(decideNotification(1200, 1000, 1000)).toBe('target_reached');
      expect(decideNotification(1200, 900, 1000)).toBe('target_reached');
    });

    it('уведомляет, если прошлой цены не было, а текущая уже не выше цели', () => {
      expect(decideNotification(null, 950, 1000)).toBe('target_reached');
    });

    it('не уведомляет повторно, если цена уже была не выше цели', () => {
      expect(decideNotification(950, 940, 1000)).toBeNull();
    });

    it('не уведомляет, если цель не достигнута', () => {
      expect(decideNotification(1200, 1100, 1000)).toBeNull();
    });

    it('при наличии цели игнорирует обычные снижения выше цели', () => {
      expect(decideNotification(2000, 1500, 1000)).toBeNull();
    });
  });

  describe('без целевой цены', () => {
    it('уведомляет при снижении не менее чем на 1%', () => {
      expect(decideNotification(1000, 989, null)).toBe('price_drop');
    });

    it('игнорирует слишком малые снижения (<1%)', () => {
      expect(decideNotification(1000, 995, null)).toBeNull();
    });

    it('не уведомляет при росте или равенстве', () => {
      expect(decideNotification(1000, 1000, null)).toBeNull();
      expect(decideNotification(1000, 1100, null)).toBeNull();
    });

    it('не уведомляет на первой проверке (нет прошлой цены)', () => {
      expect(decideNotification(null, 500, null)).toBeNull();
    });
  });
});
