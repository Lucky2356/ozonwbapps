import { prisma } from '@ozonwb/db';
import { logger } from './logger';
import { sendTelegram } from './notify';

type DigestPeriod = 'daily' | 'weekly';

const fmt = (n: number) => n.toLocaleString('ru-RU');

/**
 * Рассылает дайджест лучших снижений цен в Telegram пользователям, выбравшим период.
 * Для каждого отслеживаемого товара берём точки истории за период и сравниваем
 * первую и последнюю цену; если цена упала — попадает в дайджест. Если снижений нет —
 * сообщение не отправляем (не шумим).
 */
export async function sendDigests(period: DigestPeriod): Promise<void> {
  const days = period === 'daily' ? 1 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { telegramDigest: period, telegramChatId: { not: null } },
    include: {
      trackedProducts: {
        include: {
          priceHistory: { where: { recordedAt: { gte: since } }, orderBy: { recordedAt: 'asc' } },
        },
      },
    },
  });

  let sent = 0;
  for (const user of users) {
    const drops: { title: string; first: number; last: number; pct: number; url: string }[] = [];
    for (const tp of user.trackedProducts) {
      const pts = tp.priceHistory;
      if (pts.length < 2) continue;
      const first = pts[0].price;
      const last = pts[pts.length - 1].price;
      if (last < first && first > 0) {
        drops.push({
          title: tp.title,
          first,
          last,
          pct: Math.round((1 - last / first) * 100),
          url: tp.productUrl,
        });
      }
    }
    if (drops.length === 0) continue;

    drops.sort((a, b) => b.pct - a.pct);
    const top = drops.slice(0, 10);
    const header = period === 'daily' ? 'Дайджест за день' : 'Дайджест за неделю';
    const lines = top.map((d) => `• ${d.title}: ${fmt(d.first)} → ${fmt(d.last)} ₽ (−${d.pct}%)`);
    const text = `<b>${header}</b>\nЛучшие снижения цен среди отслеживаемых:\n${lines.join('\n')}`;
    if (await sendTelegram(user.telegramChatId, text)) sent++;
  }

  logger.info('Дайджест отправлен', { period, users: users.length, sent });
}
