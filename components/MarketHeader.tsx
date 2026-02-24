"use client";

import {
  OUTCOME_LABELS,
  OUTCOMES,
  UI_LABELS,
  VENUE_DISPLAY_NAMES,
  VENUES,
} from "@/constants";
import { aggregateOrderBooks, getBestPrices } from "@/lib/orderbook";
import { useAppSelector } from "@/store/hooks";
import { useMemo } from "react";

export function MarketHeader() {
  const selectedMarket = useAppSelector((state) => state.market.selectedMarket);
  const polymarketBook = useAppSelector(
    (state) => state.orderBook[VENUES.POLYMARKET],
  );
  const kalshiBook = useAppSelector((state) => state.orderBook[VENUES.KALSHI]);

  const aggregated = useMemo(
    () => aggregateOrderBooks(polymarketBook, kalshiBook),
    [polymarketBook, kalshiBook],
  );

  const { midPrice } = useMemo(() => getBestPrices(aggregated), [aggregated]);

  const yesProbability = midPrice !== null ? midPrice : null;
  const noProbability = yesProbability !== null ? 100 - yesProbability : null;

  if (!selectedMarket) return null;

  const venues = [];
  if (selectedMarket.polymarket)
    venues.push(VENUE_DISPLAY_NAMES[VENUES.POLYMARKET]);
  if (selectedMarket.kalshi) venues.push(VENUE_DISPLAY_NAMES[VENUES.KALSHI]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white leading-tight">
              {selectedMarket.title}
            </h1>
            {selectedMarket.description && (
              <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                {selectedMarket.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {venues.map((venue) => (
              <span
                key={venue}
                className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded"
              >
                {venue}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-4 mt-5">
          <div className="flex-1 bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {OUTCOME_LABELS[OUTCOMES.YES]}
              </span>
              <span className="text-2xl font-bold text-green-400">
                {yesProbability !== null
                  ? `${yesProbability.toFixed(1)}¢`
                  : "-"}
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${yesProbability || 0}%` }}
              />
            </div>
          </div>

          <div className="flex-1 bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {OUTCOME_LABELS[OUTCOMES.NO]}
              </span>
              <span className="text-2xl font-bold text-red-400">
                {noProbability !== null ? `${noProbability.toFixed(1)}¢` : "-"}
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${noProbability || 0}%` }}
              />
            </div>
          </div>
        </div>

        {selectedMarket.volume && (
          <div className="mt-4 text-sm text-gray-500">
            {UI_LABELS.VOLUME}: ${(selectedMarket.volume / 1000).toFixed(1)}k
          </div>
        )}
      </div>
    </div>
  );
}
