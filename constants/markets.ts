import { Market } from "@/types/orderbook";

/**
 * Hardcoded market mapping for aggregation demo
 *
 * This file contains the market IDs from both Polymarket and Kalshi
 * for the SAME underlying question, enabling order book aggregation.
 *
 * To find IDs:
 * - Polymarket: Go to market page → check network requests for clobTokenIds
 * - Kalshi: Go to market page → ticker is in the URL (e.g., KXFEDRATE-25JUN)
 */

export const HARDCODED_MARKET: Market = {
  id: "trump-deportation-2025",
  title: "Will Trump deport less than 250,000 in 2025?",
  description:
    "This market resolves to Yes if U.S. ICE removes less than 250,000 non citizens in the 2025 fiscal year",
  outcomes: ["Yes", "No"],
  endDate: "2025-12-31",

  // Polymarket CLOB token IDs (ACTIVE MARKET)
  // Market: "Will Trump deport less than 250,000?"
  polymarket: {
    conditionId:
      "0xaf9d0e448129a9f657f851d49495ba4742055d80e0ef1166ba0ee81d4d594214",
    clobTokenIds: {
      // These are real token IDs from an active Polymarket market
      yes: "101676997363687199724245607342877036148401850938023978421879460310389391082353",
      no: "4153292802911610701832309484716814274802943278345248636922528170020319407796",
    },
  },

  // Kalshi/DFlow ticker (ACTIVE MARKET)
  // Market: "Will Trump next nominate Judy Shelton as Fed Chair?"
  kalshi: {
    ticker: "KXFEDCHAIRNOM-29-JS",
    eventTicker: "KXFEDCHAIRNOM-29",
  },
};
