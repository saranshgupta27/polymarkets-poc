import { API_CONFIG } from "@/config/api";
import { VENUES } from "@/constants";
import {
  DFlowOrderBookResponse,
  KalshiMarket,
  PriceLevel,
  VenueOrderBook,
} from "@/types/orderbook";

const BASE_URL = API_CONFIG.dflow.baseUrl;

function getApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_DFLOW_API_KEY;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  const apiKey = getApiKey();
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return headers;
}

export async function fetchKalshiMarkets(
  query?: string,
  limit: number = 20,
): Promise<KalshiMarket[]> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("status", "active");

  const response = await fetch(`${BASE_URL}/markets?${params.toString()}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`DFlow API error: ${response.status}`);
  }

  const data = await response.json();
  const markets = data.markets || [];

  if (query) {
    const lowerQuery = query.toLowerCase();
    return markets.filter(
      (m: KalshiMarket) =>
        m.title?.toLowerCase().includes(lowerQuery) ||
        m.subtitle?.toLowerCase().includes(lowerQuery),
    );
  }

  return markets;
}

export async function fetchKalshiMarket(
  ticker: string,
): Promise<KalshiMarket | null> {
  try {
    const response = await fetch(`${BASE_URL}/markets?limit=100`, {
      headers: buildHeaders(),
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`DFlow API error: ${response.status}`);
    }

    const data = await response.json();
    const markets = data.markets || [];
    return markets.find((m: KalshiMarket) => m.ticker === ticker) || null;
  } catch (err) {
    console.error("Error fetching market:", err);
    return null;
  }
}
export async function fetchKalshiOrderBook(
  ticker: string,
): Promise<DFlowOrderBookResponse> {
  const response = await fetch(`${BASE_URL}/orderbook/${ticker}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`DFlow API error: ${response.status}`);
  }

  return response.json();
}

export function parseKalshiOrderBook(
  data: DFlowOrderBookResponse,
): VenueOrderBook {
  const bids: PriceLevel[] = Object.entries(data.yes_bids || {}).map(
    ([priceStr, size]) => ({
      price: Math.round(parseFloat(priceStr) * 100),
      size: size,
      venue: VENUES.KALSHI,
    }),
  );

  const asks: PriceLevel[] = Object.entries(data.no_bids || {}).map(
    ([priceStr, size]) => ({
      price: 100 - Math.round(parseFloat(priceStr) * 100),
      size: size,
      venue: VENUES.KALSHI,
    }),
  );

  return {
    bids: bids.sort((a, b) => b.price - a.price),
    asks: asks.sort((a, b) => a.price - b.price),
    lastUpdated: Date.now(),
  };
}

export function createKalshiWebSocket(
  tickers: string[],
  onMessage: (data: DFlowOrderBookResponse) => void,
  onError: (error: Event) => void,
  onOpen: () => void,
  onClose: (wasClean: boolean) => void,
): WebSocket {
  const ws = new WebSocket(API_CONFIG.dflow.wsUrl);
  let heartbeatInterval: NodeJS.Timeout | null = null;

  ws.onopen = () => {
    console.log("[Kalshi WS] Connected");

    try {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          channel: "orderbook",
          tickers: tickers,
        }),
      );
      console.log("[Kalshi WS] Subscribed to:", tickers);
    } catch (e) {
      console.error("[Kalshi WS] Failed to subscribe:", e);
    }

    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "ping" }));
        } catch (e) {
          // Ignore heartbeat errors
        }
      }
    }, 30000);

    onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "pong") {
        return;
      }

      if (data.channel === "orderbook") {
        onMessage(data);
      }
    } catch (e) {
      console.error("[Kalshi WS] Parse error:", e);
    }
  };

  ws.onerror = (error) => {
    console.error("[Kalshi WS] Error:", error);
    onError(error);
  };

  ws.onclose = (event) => {
    console.log(
      `[Kalshi WS] Disconnected. Code: ${event.code}, Clean: ${event.wasClean}`,
    );

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    onClose(event.wasClean && event.code === 1000);
  };

  return ws;
}
