import { MarketplaceAdapter } from './types';
import { WildberriesAdapter } from './wildberries';
import { OzonAdapter } from './ozon';
import { YandexMarketAdapter } from './yandexmarket';
import { DnsAdapter } from './dns';
import { config } from '../config';

/**
 * Реестр адаптеров. Чтобы добавить маркетплейс — создайте новый класс-адаптер
 * и зарегистрируйте его здесь. Остальной код менять не нужно.
 */
const ALL: MarketplaceAdapter[] = [
  new WildberriesAdapter(),
  new OzonAdapter(),
  new YandexMarketAdapter(),
  new DnsAdapter(),
];

const byName = new Map<string, MarketplaceAdapter>(ALL.map((a) => [a.marketplaceName, a]));

/** Возвращает адаптеры для запрошенных и включённых маркетплейсов. */
export function resolveAdapters(requested: string[]): MarketplaceAdapter[] {
  return requested
    .filter((m) => config.enabledMarketplaces.includes(m))
    .map((m) => byName.get(m))
    .filter((a): a is MarketplaceAdapter => Boolean(a));
}
