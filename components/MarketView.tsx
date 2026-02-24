"use client";

import {
  UI_LABELS,
  VENUE_DISPLAY_NAMES,
  VENUES,
  VIEW_MODES,
  ViewModeId,
} from "@/constants";
import { HARDCODED_MARKET } from "@/constants/markets";
import { useOrderBookData } from "@/hooks/useVenueWebSocket";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { marketActions } from "@/store/slices";
import { useEffect, useState } from "react";
import { ConnectionStatus } from "./ConnectionStatus";
import { MarketHeader } from "./MarketHeader";
import { OrderBook } from "./OrderBook";
import { QuoteCalculator } from "./QuoteCalculator";
import { ViewModeSelector } from "./ViewModeSelector";

export function MarketView() {
  const dispatch = useAppDispatch();
  const [viewMode, setViewMode] = useState<ViewModeId>(VIEW_MODES.COMBINED);
  const selectedMarket = useAppSelector((state) => state.market.selectedMarket);

  // Load hardcoded market on mount
  useEffect(() => {
    dispatch(marketActions.setSelectedMarket(HARDCODED_MARKET));
  }, [dispatch]);

  useOrderBookData({
    market: selectedMarket,
    enabled: !!selectedMarket,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg" />
              <span className="font-semibold text-lg">Market Aggregator</span>
            </div>
            <div className="text-sm text-gray-400">
              Prediction Market Analytics
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {selectedMarket ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <MarketHeader />

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {UI_LABELS.ORDER_BOOK}
                </h2>
                <ViewModeSelector
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
              </div>

              <OrderBook viewMode={viewMode} />
            </div>

            <div className="space-y-6">
              <ConnectionStatus />
              <QuoteCalculator />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            Loading market...
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Prediction Market Aggregator</span>
            <span>
              Live data from {VENUE_DISPLAY_NAMES[VENUES.POLYMARKET]} &{" "}
              {VENUE_DISPLAY_NAMES[VENUES.KALSHI]}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
