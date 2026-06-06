-- Цена со спец-условием оплаты (Ozon Карта / WB-кошелёк), если ниже обычной
ALTER TABLE "Offer" ADD COLUMN "priceWithCard" DOUBLE PRECISION;
