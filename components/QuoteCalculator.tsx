"use client";

import {
  OUTCOME_LABELS,
  OutcomeId,
  OUTCOMES,
  UI_LABELS,
  VENUE_DISPLAY_NAMES,
  VENUES,
} from "@/constants";
import { calculateQuote } from "@/lib/orderbook";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { quoteActions } from "@/store/slices";
import { QuoteResult } from "@/types/orderbook";
import { useCallback, useMemo, useState } from "react";

export function QuoteCalculator() {
  const dispatch = useAppDispatch();
  const { amount, outcome } = useAppSelector((state) => state.quote);
  const polymarketBook = useAppSelector(
    (state) => state.orderBook[VENUES.POLYMARKET],
  );
  const kalshiBook = useAppSelector((state) => state.orderBook[VENUES.KALSHI]);

  const [inputValue, setInputValue] = useState(amount.toString());

  // Calculate quote based on current order books
  const quote = useMemo<QuoteResult | null>(() => {
    return calculateQuote(amount, outcome, polymarketBook, kalshiBook);
  }, [amount, outcome, polymarketBook, kalshiBook]);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        dispatch(quoteActions.setAmount(numValue));
      }
    },
    [dispatch],
  );

  const handleOutcomeChange = useCallback(
    (newOutcome: OutcomeId) => {
      dispatch(quoteActions.setOutcome(newOutcome));
    },
    [dispatch],
  );

  const presetAmounts = [50, 100, 250, 500, 1000];

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">
          {UI_LABELS.GET_QUOTE}
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          {UI_LABELS.CALCULATE_SHARES}
        </p>
      </div>

      {/* Outcome Selection */}
      <div className="px-4 py-4 border-b border-gray-800">
        <label className="text-sm text-gray-400 mb-2 block">
          {UI_LABELS.SELECT_OUTCOME}
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleOutcomeChange(OUTCOMES.YES)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              outcome === OUTCOMES.YES
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {OUTCOME_LABELS[OUTCOMES.YES]}
          </button>
          <button
            onClick={() => handleOutcomeChange(OUTCOMES.NO)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              outcome === OUTCOMES.NO
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {OUTCOME_LABELS[OUTCOMES.NO]}
          </button>
        </div>
      </div>

      {/* Amount Input */}
      <div className="px-4 py-4 border-b border-gray-800">
        <label className="text-sm text-gray-400 mb-2 block">
          {UI_LABELS.AMOUNT_TO_SPEND}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            $
          </span>
          <input
            type="number"
            value={inputValue}
            onChange={handleAmountChange}
            min="0"
            step="10"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-8 pr-4 text-white font-mono text-lg focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="100"
          />
        </div>

        {/* Preset amounts */}
        <div className="flex gap-2 mt-3">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setInputValue(preset.toString());
                dispatch(quoteActions.setAmount(preset));
              }}
              className={`flex-1 py-1.5 text-sm rounded transition-colors ${
                amount === preset
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>
      </div>

      {/* Quote Result */}
      <div className="px-4 py-4">
        {quote ? (
          <div className="space-y-4">
            {/* Total shares */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">
                {UI_LABELS.YOU_WOULD_RECEIVE}
              </div>
              <div className="text-3xl font-bold text-white mt-1">
                {quote.totalShares.toFixed(2)} {UI_LABELS.SHARES}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {UI_LABELS.AVG_PRICE}: {quote.averagePrice.toFixed(1)}¢{" "}
                {UI_LABELS.PER_SHARE}
              </div>
            </div>

            {/* Venue breakdown */}
            <div className="space-y-2">
              <div className="text-sm text-gray-400">
                {UI_LABELS.FILL_BREAKDOWN}
              </div>

              {/* Polymarket */}
              {quote.breakdown[VENUES.POLYMARKET].shares > 0 && (
                <div className="flex justify-between items-center bg-gray-800/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-gray-300">
                      {VENUE_DISPLAY_NAMES[VENUES.POLYMARKET]}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono">
                      {quote.breakdown[VENUES.POLYMARKET].shares.toFixed(2)}{" "}
                      {UI_LABELS.SHARES}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${quote.breakdown[VENUES.POLYMARKET].spent.toFixed(2)}{" "}
                      spent
                    </div>
                  </div>
                </div>
              )}

              {/* Kalshi */}
              {quote.breakdown[VENUES.KALSHI].shares > 0 && (
                <div className="flex justify-between items-center bg-gray-800/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-gray-300">
                      {VENUE_DISPLAY_NAMES[VENUES.KALSHI]}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-mono">
                      {quote.breakdown[VENUES.KALSHI].shares.toFixed(2)}{" "}
                      {UI_LABELS.SHARES}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${quote.breakdown[VENUES.KALSHI].spent.toFixed(2)} spent
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fill details */}
            {quote.fills.length > 1 && (
              <div className="space-y-1">
                <div className="text-sm text-gray-400">Fill Details</div>
                <div className="bg-gray-800/30 rounded-lg divide-y divide-gray-800">
                  {quote.fills.slice(0, 5).map((fill, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center px-3 py-2 text-sm"
                    >
                      <span className="text-gray-400">
                        {fill.venue === VENUES.POLYMARKET ? "PM" : "KS"} @{" "}
                        {fill.price}¢
                      </span>
                      <span className="text-gray-300 font-mono">
                        {fill.shares.toFixed(2)} {UI_LABELS.SHARES}
                      </span>
                    </div>
                  ))}
                  {quote.fills.length > 5 && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      +{quote.fills.length - 5} more fills
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {amount <= 0
              ? "Enter an amount to see quote"
              : "No liquidity available"}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-3 bg-gray-800/30 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          This is a pricing estimate only. No real orders are placed.
        </p>
      </div>
    </div>
  );
}
