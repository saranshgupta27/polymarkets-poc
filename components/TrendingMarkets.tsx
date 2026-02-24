"use client";

import { fetchPolymarketMarkets } from "@/api/polymarket";
import { OUTCOME_LABELS, OUTCOMES, VENUES } from "@/constants";
import { useAppDispatch } from "@/store/hooks";
import { marketActions } from "@/store/slices";
import { Market, PolymarketMarket } from "@/types/orderbook";
import { useCallback, useEffect, useState } from "react";

export function TrendingMarkets() {
  const dispatch = useAppDispatch();
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTrending() {
      try {
        setIsLoading(true);
        // Fetch popular/active markets without search query
        const results = await fetchPolymarketMarkets(undefined, 12);
        setMarkets(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load markets");
      } finally {
        setIsLoading(false);
      }
    }

    loadTrending();
  }, []);

  const selectMarket = useCallback(
    (market: PolymarketMarket) => {
      const yesToken = market.tokens?.find(
        (t) => t.outcome?.toLowerCase() === OUTCOMES.YES,
      );
      const noToken = market.tokens?.find(
        (t) => t.outcome?.toLowerCase() === OUTCOMES.NO,
      );

      const normalizedMarket: Market = {
        id: market.condition_id,
        title: market.question,
        description: market.description || "",
        outcomes: [OUTCOME_LABELS[OUTCOMES.YES], OUTCOME_LABELS[OUTCOMES.NO]],
        endDate: market.end_date_iso,
        volume: market.volume_num,
        polymarket: {
          conditionId: market.condition_id,
          clobTokenIds: {
            yes: yesToken?.token_id || "",
            no: noToken?.token_id || "",
          },
        },
      };

      dispatch(marketActions.setSelectedMarket(normalizedMarket));
    },
    [dispatch],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-800/50 rounded-lg p-4 animate-pulse h-32"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Unable to load markets</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No markets available</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-orange-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
            clipRule="evenodd"
          />
        </svg>
        Trending Markets
        <span className="text-sm font-normal text-gray-500 ml-2">
          from {VENUES.POLYMARKET}
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {markets.map((market) => (
          <button
            key={market.condition_id}
            onClick={() => selectMarket(market)}
            className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg p-4 text-left transition-all group"
          >
            <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-3">
              {market.question}
            </h3>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {market.tokens?.[0] && (
                  <span className="text-green-400">
                    Yes:{" "}
                    {(Number(market.tokens[0].price || 0) * 100).toFixed(0)}¢
                  </span>
                )}
              </div>

              {market.volume_num && (
                <span className="text-gray-500">
                  ${(market.volume_num / 1000).toFixed(0)}k vol
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
