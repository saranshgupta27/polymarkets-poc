import { OUTCOMES, OutcomeId, VENUES, VenueId } from "@/constants";
import {
  AggregatedPriceLevel,
  FillDetail,
  PriceLevel,
  QuoteResult,
  VenueOrderBook,
} from "@/types/orderbook";

export function aggregateOrderBooks(
  polymarket: VenueOrderBook,
  kalshi: VenueOrderBook,
): { bids: AggregatedPriceLevel[]; asks: AggregatedPriceLevel[] } {
  const aggregateLevels = (
    polyLevels: PriceLevel[],
    kalshiLevels: PriceLevel[],
  ): AggregatedPriceLevel[] => {
    const priceMap = new Map<number, AggregatedPriceLevel>();

    for (const level of polyLevels) {
      const existing = priceMap.get(level.price);
      if (existing) {
        existing.totalSize += level.size;
        existing.breakdown[VENUES.POLYMARKET] += level.size;
      } else {
        priceMap.set(level.price, {
          price: level.price,
          totalSize: level.size,
          breakdown: {
            [VENUES.POLYMARKET]: level.size,
            [VENUES.KALSHI]: 0,
          },
        });
      }
    }

    for (const level of kalshiLevels) {
      const existing = priceMap.get(level.price);
      if (existing) {
        existing.totalSize += level.size;
        existing.breakdown[VENUES.KALSHI] += level.size;
      } else {
        priceMap.set(level.price, {
          price: level.price,
          totalSize: level.size,
          breakdown: {
            [VENUES.POLYMARKET]: 0,
            [VENUES.KALSHI]: level.size,
          },
        });
      }
    }

    return Array.from(priceMap.values());
  };

  const bids = aggregateLevels(polymarket.bids, kalshi.bids).sort(
    (a, b) => b.price - a.price,
  );

  const asks = aggregateLevels(polymarket.asks, kalshi.asks).sort(
    (a, b) => a.price - b.price,
  );

  return { bids, asks };
}

export function getBestPrices(aggregated: {
  bids: AggregatedPriceLevel[];
  asks: AggregatedPriceLevel[];
}): {
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  midPrice: number | null;
} {
  const bestBid = aggregated.bids[0]?.price ?? null;
  const bestAsk = aggregated.asks[0]?.price ?? null;

  const spread =
    bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;
  const midPrice =
    bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : null;

  return { bestBid, bestAsk, spread, midPrice };
}

export function calculateQuote(
  amountToSpend: number,
  outcome: OutcomeId,
  polymarket: VenueOrderBook,
  kalshi: VenueOrderBook,
): QuoteResult | null {
  if (amountToSpend <= 0) {
    return null;
  }

  const allAsks: (PriceLevel & { venue: VenueId })[] = [
    ...polymarket.asks.map((level) => ({
      ...level,
      venue: VENUES.POLYMARKET,
    })),
    ...kalshi.asks.map((level) => ({ ...level, venue: VENUES.KALSHI })),
  ];

  const relevantAsks =
    outcome === OUTCOMES.YES
      ? allAsks.sort((a, b) => a.price - b.price)
      : allAsks
          .map((ask) => {
            const originalPrice = ask.price;
            const invertedPrice = 100 - originalPrice;

            if (invertedPrice < 0.5 || originalPrice < 0.5) {
              return null;
            }

            const invertedSize = (ask.size * invertedPrice) / originalPrice;

            return {
              ...ask,
              price: invertedPrice,
              size: invertedSize,
            };
          })
          .filter((ask): ask is NonNullable<typeof ask> => ask !== null)
          .sort((a, b) => a.price - b.price);

  const fills: FillDetail[] = [];
  let remainingAmount = amountToSpend;
  let totalShares = 0;

  const breakdown = {
    [VENUES.POLYMARKET]: { shares: 0, spent: 0 },
    [VENUES.KALSHI]: { shares: 0, spent: 0 },
  };

  for (const ask of relevantAsks) {
    if (remainingAmount <= 0) break;

    const priceInDollars = ask.price / 100;

    if (priceInDollars < 0.005) {
      continue;
    }

    const affordableSpend = Math.min(remainingAmount, ask.size);
    const sharesToBuy = affordableSpend / priceInDollars;

    if (sharesToBuy > 1000000) {
      continue;
    }

    if (sharesToBuy > 0 && isFinite(sharesToBuy)) {
      fills.push({
        venue: ask.venue,
        price: ask.price,
        size: affordableSpend,
        shares: sharesToBuy,
      });

      totalShares += sharesToBuy;
      remainingAmount -= affordableSpend;

      breakdown[ask.venue].shares += sharesToBuy;
      breakdown[ask.venue].spent += affordableSpend;
    }
  }

  if (fills.length === 0 || totalShares === 0 || !isFinite(totalShares)) {
    return null;
  }

  const totalSpent = amountToSpend - remainingAmount;
  const averagePrice =
    totalSpent > 0 && totalShares > 0 ? (totalSpent / totalShares) * 100 : 0;

  if (!isFinite(averagePrice) || averagePrice < 0 || averagePrice > 100) {
    return null;
  }

  return {
    totalShares,
    averagePrice,
    fills,
    breakdown,
  };
}

export function formatPrice(priceCents: number): string {
  return priceCents % 1 === 0 ? `${priceCents}¢` : `${priceCents.toFixed(1)}¢`;
}

export function formatSize(sizeDollars: number): string {
  if (sizeDollars >= 1000) {
    return `$${(sizeDollars / 1000).toFixed(1)}k`;
  }
  return `$${sizeDollars.toFixed(0)}`;
}
