import { OUTCOMES, OutcomeId, VENUES, VenueId } from "@/constants";
import {
  AggregatedPriceLevel,
  FillDetail,
  PriceLevel,
  QuoteResult,
  VenueOrderBook,
} from "@/types/orderbook";

// Combines order books from both venues by price level
export function aggregateOrderBooks(
  polymarket: VenueOrderBook,
  kalshi: VenueOrderBook,
): { bids: AggregatedPriceLevel[]; asks: AggregatedPriceLevel[] } {
  function mergeByPrice(
    polyOrders: PriceLevel[],
    kalshiOrders: PriceLevel[],
  ): AggregatedPriceLevel[] {
    const combined = new Map<number, AggregatedPriceLevel>();

    // Add Polymarket orders
    for (const order of polyOrders) {
      combined.set(order.price, {
        price: order.price,
        totalSize: order.size,
        breakdown: {
          [VENUES.POLYMARKET]: order.size,
          [VENUES.KALSHI]: 0,
        },
      });
    }

    // Merge or add Kalshi orders
    for (const order of kalshiOrders) {
      const existing = combined.get(order.price);
      if (existing) {
        existing.totalSize += order.size;
        existing.breakdown[VENUES.KALSHI] = order.size;
      } else {
        combined.set(order.price, {
          price: order.price,
          totalSize: order.size,
          breakdown: {
            [VENUES.POLYMARKET]: 0,
            [VENUES.KALSHI]: order.size,
          },
        });
      }
    }

    return Array.from(combined.values());
  }

  return {
    bids: mergeByPrice(polymarket.bids, kalshi.bids).sort(
      (a, b) => b.price - a.price, // Highest price first
    ),
    asks: mergeByPrice(polymarket.asks, kalshi.asks).sort(
      (a, b) => a.price - b.price, // Lowest price first
    ),
  };
}

// Extracts best prices from aggregated order book
export function getBestPrices(aggregated: {
  bids: AggregatedPriceLevel[];
  asks: AggregatedPriceLevel[];
}) {
  const bestBid = aggregated.bids[0]?.price ?? null;
  const bestAsk = aggregated.asks[0]?.price ?? null;
  
  const hasValidPrices = bestBid !== null && bestAsk !== null;

  return {
    bestBid,
    bestAsk,
    spread: hasValidPrices ? bestAsk - bestBid : null,
    midPrice: hasValidPrices ? (bestBid + bestAsk) / 2 : null,
  };
}

// Convert YES bids to NO asks (buying YES = selling NO)
function convertBidsToNoAsks(
  bids: PriceLevel[],
  venue: VenueId,
): (PriceLevel & { venue: VenueId })[] {
  return bids
    .map((bid) => {
      const yesPrice = bid.price;
      const noPrice = 100 - yesPrice;

      // Skip extreme prices
      if (noPrice < 0.5 || yesPrice < 0.5) return null;

      // Adjust size: $10 of YES at 10¢ = 100 shares, but same $10 at NO's 90¢ = 11.11 shares
      const adjustedSize = (bid.size * noPrice) / yesPrice;

      return {
        price: noPrice,
        size: adjustedSize,
        venue,
      };
    })
    .filter((order): order is NonNullable<typeof order> => order !== null);
}

// Get all available orders for the chosen outcome
function getOrdersForOutcome(
  outcome: OutcomeId,
  polymarket: VenueOrderBook,
  kalshi: VenueOrderBook,
): (PriceLevel & { venue: VenueId })[] {
  if (outcome === OUTCOMES.YES) {
    // For YES: use asks (people selling YES)
    const orders = [
      ...polymarket.asks.map((ask) => ({ ...ask, venue: VENUES.POLYMARKET })),
      ...kalshi.asks.map((ask) => ({ ...ask, venue: VENUES.KALSHI })),
    ];
    return orders.sort((a, b) => a.price - b.price); // Cheapest first
  } else {
    // For NO: use bids (people buying YES = selling NO)
    const polyBidsAsNo = convertBidsToNoAsks(
      polymarket.bids,
      VENUES.POLYMARKET,
    );
    const kalshiBidsAsNo = convertBidsToNoAsks(kalshi.bids, VENUES.KALSHI);

    return [...polyBidsAsNo, ...kalshiBidsAsNo].sort(
      (a, b) => a.price - b.price, // Cheapest NO first
    );
  }
}

// Calculate quote: how many shares can I buy with $X?
export function calculateQuote(
  dollarAmount: number,
  outcome: OutcomeId,
  polymarket: VenueOrderBook,
  kalshi: VenueOrderBook,
): QuoteResult | null {
  if (dollarAmount <= 0) return null;

  const availableOrders = getOrdersForOutcome(
    outcome,
    polymarket,
    kalshi,
  );

  const fills: FillDetail[] = [];
  const venueBreakdown = {
    [VENUES.POLYMARKET]: { shares: 0, spent: 0 },
    [VENUES.KALSHI]: { shares: 0, spent: 0 },
  };

  let remainingDollars = dollarAmount;
  let totalShares = 0;

  // Fill orders from cheapest to most expensive
  for (const order of availableOrders) {
    if (remainingDollars <= 0) break;

    const pricePerShare = order.price / 100; // Convert cents to dollars

    // Skip unrealistic prices
    if (pricePerShare < 0.005) continue;

    // How much of this order can we afford?
    const spendOnThisOrder = Math.min(remainingDollars, order.size);
    const sharesBought = spendOnThisOrder / pricePerShare;

    // Skip unrealistic share amounts
    if (sharesBought > 1_000_000 || !isFinite(sharesBought)) continue;

    fills.push({
      venue: order.venue,
      price: order.price,
      size: spendOnThisOrder,
      shares: sharesBought,
    });

    totalShares += sharesBought;
    remainingDollars -= spendOnThisOrder;

    venueBreakdown[order.venue].shares += sharesBought;
    venueBreakdown[order.venue].spent += spendOnThisOrder;
  }

  // Validate results
  if (fills.length === 0 || totalShares === 0 || !isFinite(totalShares)) {
    return null;
  }

  const totalSpent = dollarAmount - remainingDollars;
  const avgPriceInCents = (totalSpent / totalShares) * 100;

  if (!isFinite(avgPriceInCents) || avgPriceInCents < 0 || avgPriceInCents > 100) {
    return null;
  }

  return {
    totalShares,
    averagePrice: avgPriceInCents,
    fills,
    breakdown: venueBreakdown,
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
