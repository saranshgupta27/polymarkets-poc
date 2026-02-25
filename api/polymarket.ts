import { API_CONFIG } from "@/config/api";
import { VENUES } from "@/constants";
import {
  PolymarketMarket,
  PolymarketOrderBookResponse,
  PriceLevel,
  VenueOrderBook,
} from "@/types/orderbook";

const BASE_URL = API_CONFIG.polymarket.baseUrl;

export async function fetchPolymarketMarkets(
  query?: string,
  limit: number = 20,
): Promise<PolymarketMarket[]> {
  const params = new URLSearchParams();
  if (query) params.append("_q", query);
  params.append("_limit", limit.toString());
  params.append("active", "true");
  params.append("closed", "false");

  const response = await fetch(`${BASE_URL}/markets?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status}`);
  }
  const data = await response.json();
  return data.data || data;
}

export async function fetchPolymarketMarket(
  conditionId: string,
): Promise<PolymarketMarket | null> {
  const response = await fetch(`${BASE_URL}/markets/${conditionId}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Polymarket API error: ${response.status}`);
  }
  return response.json();
}

export async function fetchPolymarketOrderBook(
  tokenId: string,
): Promise<PolymarketOrderBookResponse> {
  const response = await fetch(`${BASE_URL}/book?token_id=${tokenId}`);
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.status}`);
  }
  return response.json();
}

// Convert Polymarket API format (0.0-1.0) to our internal format (0-100 cents)
export function parsePolymarketOrderBook(
  data: PolymarketOrderBookResponse,
): VenueOrderBook {
  function convertOrder(order: { price: string; size: string }): PriceLevel {
    const priceInCents = parseFloat(order.price) * 100; // 0.5 -> 50¢
    return {
      price: Math.round(priceInCents * 10) / 10, // Round to 0.1¢ precision
      size: parseFloat(order.size),
      venue: VENUES.POLYMARKET,
    };
  }

  return {
    bids: data.bids.map(convertOrder).sort((a, b) => b.price - a.price),
    asks: data.asks.map(convertOrder).sort((a, b) => a.price - b.price),
    lastUpdated: Date.now(),
  };
}

export function createPolymarketWebSocket(
  tokenIds: string[],
  onMessage: (data: PolymarketOrderBookResponse) => void,
  onError: (error: Event) => void,
  onOpen: () => void,
  onClose: (wasClean: boolean) => void,
): WebSocket {
  const ws = new WebSocket(API_CONFIG.polymarket.wsUrl);
  let heartbeatInterval: NodeJS.Timeout | null = null;

  ws.onopen = () => {
    console.log("[Polymarket WS] Connected");

    try {
      ws.send(
        JSON.stringify({
          type: "market",
          assets_ids: tokenIds,
          custom_feature_enabled: true,
        }),
      );
      console.log("[Polymarket WS] Subscribed to tokens:", tokenIds);
    } catch (e) {
      console.error("[Polymarket WS] Failed to send subscription:", e);
    }

    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "ping" }));
        } catch (e) {
          // Ignore ping errors
        }
      }
    }, 30000);

    onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const messages = Array.isArray(data) ? data : [data];

      for (const msg of messages) {
        if (msg.bids && msg.asks) {
          onMessage(msg);
        }
      }
    } catch (e) {
      // Ignore non-JSON messages (e.g., keep-alives or error responses)
    }
  };

  ws.onerror = (error) => {
    console.error("[Polymarket WS] WebSocket error:", error);
    onError(error);
  };

  ws.onclose = (event) => {
    console.log(
      `[Polymarket WS] Disconnected. Code: ${event.code}, Reason: ${event.reason || "Unknown"}, Clean: ${event.wasClean}`,
    );

    // Clean up heartbeat interval
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    onClose(event.wasClean && event.code === 1000);
  };

  return ws;
}
