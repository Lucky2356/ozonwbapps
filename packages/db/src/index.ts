/**
 * Единая точка доступа к Prisma-клиенту и типам БД.
 * Реэкспортируем сгенерированный клиент, чтобы api и worker импортировали отсюда.
 */
export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';

import { PrismaClient } from '@prisma/client';

/** Готовый синглтон клиента (удобно для worker и скриптов). */
export const prisma = new PrismaClient();
