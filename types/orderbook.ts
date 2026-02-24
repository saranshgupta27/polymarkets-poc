import { ConnectionStatusId, OutcomeId, VENUES, VenueId } from "@/constants";

export interface PriceLevel {
  price: number;
  size: number;
  venue: VenueId;
}

export interface AggregatedPriceLevel {
  price: number;
  totalSize: number;
  breakdown: {
    [VENUES.POLYMARKET]: number;
    [VENUES.KALSHI]: number;
  };
}

export interface VenueOrderBook {
  bids: PriceLevel[];
  asks: PriceLevel[];
  lastUpdated: number | null;
}

export interface AggregatedOrderBook {
  bids: AggregatedPriceLevel[];
  asks: AggregatedPriceLevel[];
}

export type ConnectionStatus = ConnectionStatusId;

export interface VenueConnectionState {
  status: ConnectionStatus;
  lastConnected: number | null;
  errorMessage: string | null;
  reconnectAttempts: number;
}

export interface QuoteRequest {
  amount: number;
  outcome: OutcomeId;
}

export interface FillDetail {
  venue: VenueId;
  price: number;
  size: number;
  shares: number;
}

export interface QuoteResult {
  totalShares: number;
  averagePrice: number;
  fills: FillDetail[];
  breakdown: {
    [VENUES.POLYMARKET]: {
      shares: number;
      spent: number;
    };
    [VENUES.KALSHI]: {
      shares: number;
      spent: number;
    };
  };
}

export interface Market {
  id: string;
  title: string;
  description: string;
  outcomes: string[];
  endDate?: string;
  volume?: number;
  polymarket?: {
    conditionId: string;
    clobTokenIds: {
      yes: string;
      no: string;
    };
  };
  kalshi?: {
    ticker: string;
    eventTicker: string;
  };
}

export interface PolymarketToken {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

export interface PolymarketMarket {
  condition_id: string;
  question_id: string;
  tokens: PolymarketToken[];
  question: string;
  description: string;
  market_slug: string;
  end_date_iso: string;
  active: boolean;
  closed: boolean;
  volume: number;
  volume_num: number;
}

// KalshiMarket type - matches DFlow API response format
// Docs: https://pond.dflow.net/build/metadata-api/markets/markets
export interface KalshiMarket {
  ticker: string;
  eventTicker: string; // camelCase from DFlow API
  title: string;
  subtitle: string;
  yesSubTitle?: string;
  noSubTitle?: string;
  openTime: number;
  closeTime: number;
  expirationTime: number;
  status: string;
  yesBid: string | null; // string like "0.9400" or null
  yesAsk: string | null;
  noBid: string | null;
  noAsk: string | null;
  volume: number;
  openInterest?: number;
  result?: string;
}

export interface PolymarketOrderBookResponse {
  market: string;
  asset_id: string;
  hash: string;
  timestamp: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

// DFlow API orderbook response format
// Docs: https://pond.dflow.net/build/metadata-api/websockets/orderbook
export interface DFlowOrderBookResponse {
  channel?: string;
  type?: string;
  market_ticker: string;
  yes_bids: Record<string, number>; // price string -> quantity
  no_bids: Record<string, number>; // price string -> quantity
}

// Legacy Kalshi direct API format (kept for compatibility)
export interface KalshiOrderBookResponse {
  orderbook: {
    yes: Array<[number, number]>;
    no: Array<[number, number]>;
  };
}

export type Venue = VenueId;
