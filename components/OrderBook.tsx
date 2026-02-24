"use client";

import {
  UI_LABELS,
  VENUE_DISPLAY_NAMES,
  VENUES,
  VIEW_MODES,
  ViewModeId,
} from "@/constants";
import {
  aggregateOrderBooks,
  formatPrice,
  formatSize,
  getBestPrices,
} from "@/lib/orderbook";
import { useAppSelector } from "@/store/hooks";
import { AggregatedPriceLevel } from "@/types/orderbook";
import { useMemo } from "react";

const MAX_ORDERBOOK_LEVELS = 12;

interface OrderBookRowProps {
  level: AggregatedPriceLevel;
  side: "bid" | "ask";
  maxSize: number;
  showBreakdown?: boolean;
}

function OrderBookRow({
  level,
  side,
  maxSize,
  showBreakdown = true,
}: OrderBookRowProps) {
  const widthPercent = maxSize > 0 ? (level.totalSize / maxSize) * 100 : 0;
  const polyPercent =
    level.totalSize > 0
      ? (level.breakdown[VENUES.POLYMARKET] / level.totalSize) * 100
      : 0;

  const bgColor = side === "bid" ? "bg-green-500/20" : "bg-red-500/20";
  const textColor = side === "bid" ? "text-green-400" : "text-red-400";

  return (
    <div className="relative flex items-center h-7 px-2 hover:bg-white/5 transition-colors">
      {/* Background depth bar */}
      <div
        className={`absolute inset-y-0 left-0 ${bgColor}`}
        style={{ width: `${widthPercent}%` }}
      >
        {/* Venue breakdown within the bar */}
        {showBreakdown &&
          level.breakdown[VENUES.POLYMARKET] > 0 &&
          level.breakdown[VENUES.KALSHI] > 0 && (
            <div
              className="absolute inset-y-0 left-0 bg-blue-500/30"
              style={{ width: `${polyPercent}%` }}
            />
          )}
      </div>

      {/* Content */}
      <div className="relative flex w-full justify-between items-center text-xs font-mono">
        <span className={`${textColor} font-medium`}>
          {formatPrice(level.price)}
        </span>
        <span className="text-gray-300">{formatSize(level.totalSize)}</span>
      </div>
    </div>
  );
}

interface OrderBookProps {
  viewMode: ViewModeId;
}

export function OrderBook({ viewMode }: OrderBookProps) {
  const polymarketBook = useAppSelector(
    (state) => state.orderBook[VENUES.POLYMARKET],
  );
  const kalshiBook = useAppSelector((state) => state.orderBook[VENUES.KALSHI]);

  const displayedBook = useMemo(() => {
    if (viewMode === VIEW_MODES.COMBINED) {
      return aggregateOrderBooks(polymarketBook, kalshiBook);
    } else if (viewMode === VIEW_MODES.POLYMARKET) {
      return aggregateOrderBooks(polymarketBook, {
        bids: [],
        asks: [],
        lastUpdated: null,
      });
    } else {
      return aggregateOrderBooks(
        { bids: [], asks: [], lastUpdated: null },
        kalshiBook,
      );
    }
  }, [polymarketBook, kalshiBook, viewMode]);

  const { spread, midPrice } = useMemo(
    () => getBestPrices(displayedBook),
    [displayedBook],
  );

  const bids = displayedBook.bids.slice(0, MAX_ORDERBOOK_LEVELS);
  const asks = displayedBook.asks.slice(0, MAX_ORDERBOOK_LEVELS);

  const maxSize = useMemo(() => {
    const allSizes = [...bids, ...asks].map((l) => l.totalSize);
    return Math.max(...allSizes, 1);
  }, [bids, asks]);

  const showBreakdown = viewMode === VIEW_MODES.COMBINED;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Outcome indicator */}
      <div className="px-4 py-2.5 bg-linear-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Order Book for:</span>
            <span className="font-semibold text-blue-400 uppercase tracking-wide">
              YES Outcome
            </span>
          </div>
          <div className="text-xs text-gray-500">
            <span className="hidden sm:inline">
              Bids = Buy YES | Asks = Sell YES
            </span>
            <span className="sm:hidden">YES orders</span>
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span>NO outcome price = 100¢ - YES price</span>
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-2 gap-px bg-gray-800">
        <div className="px-3 py-2 bg-gray-900">
          <div className="flex justify-between text-xs text-gray-500 uppercase tracking-wider font-medium">
            <span>Bid Price</span>
            <span>Size</span>
          </div>
        </div>
        <div className="px-3 py-2 bg-gray-900">
          <div className="flex justify-between text-xs text-gray-500 uppercase tracking-wider font-medium">
            <span>Ask Price</span>
            <span>Size</span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-px bg-gray-800">
        {/* Left column - Bids */}
        <div className="bg-gray-900 divide-y divide-gray-800/50">
          {bids.map((level) => (
            <OrderBookRow
              key={`bid-${level.price}`}
              level={level}
              side="bid"
              maxSize={maxSize}
              showBreakdown={showBreakdown}
            />
          ))}
          {bids.length === 0 && (
            <div className="px-3 py-8 text-center text-gray-600 text-sm">
              No bids
            </div>
          )}
        </div>

        {/* Right column - Asks */}
        <div className="bg-gray-900 divide-y divide-gray-800/50">
          {asks.map((level) => (
            <OrderBookRow
              key={`ask-${level.price}`}
              level={level}
              side="ask"
              maxSize={maxSize}
              showBreakdown={showBreakdown}
            />
          ))}
          {asks.length === 0 && (
            <div className="px-3 py-8 text-center text-gray-600 text-sm">
              No asks
            </div>
          )}
        </div>
      </div>

      {/* Spread indicator */}
      <div className="px-4 py-2.5 bg-gray-800/50 border-t border-gray-700">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400 font-medium">{UI_LABELS.SPREAD}</span>
          <span className="text-white font-mono font-semibold">
            {spread !== null ? `${spread.toFixed(1)}¢` : "-"}
          </span>
          {midPrice !== null && (
            <span className="text-gray-400 text-xs">
              {UI_LABELS.MID}:{" "}
              <span className="text-white">{midPrice.toFixed(1)}¢</span>
            </span>
          )}
        </div>
      </div>

      {/* Legend for combined view */}
      {viewMode === VIEW_MODES.COMBINED && (
        <div className="px-4 py-2 border-t border-gray-800 flex gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500/30 rounded-sm border border-blue-500/50" />
            <span>{VENUE_DISPLAY_NAMES[VENUES.POLYMARKET]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gray-500/30 rounded-sm border border-gray-500/50" />
            <span>{VENUE_DISPLAY_NAMES[VENUES.KALSHI]}</span>
          </div>
        </div>
      )}
    </div>
  );
}
