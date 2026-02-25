"use client";

import {
  createKalshiWebSocket,
  fetchKalshiOrderBook,
  parseKalshiOrderBook,
} from "@/api/kalshi";
import {
  createPolymarketWebSocket,
  parsePolymarketOrderBook,
} from "@/api/polymarket";
import { WS_CONFIG } from "@/config/api";
import { CONNECTION_STATUS, ERROR_MESSAGES, VENUES } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { connectionActions, orderBookActions } from "@/store/slices";
import { KalshiMarket, Market } from "@/types/orderbook";
import { useCallback, useEffect, useRef } from "react";

interface UseOrderBookDataOptions {
  market: Market | null;
  linkedKalshiMarket?: KalshiMarket | null;
  enabled?: boolean;
}

export function useOrderBookData({
  market,
  linkedKalshiMarket,
  enabled = true,
}: UseOrderBookDataOptions) {
  const dispatch = useAppDispatch();
  const polymarketConnection = useAppSelector(
    (state) => state.connection[VENUES.POLYMARKET],
  );
  const kalshiConnection = useAppSelector(
    (state) => state.connection[VENUES.KALSHI],
  );
  const polymarketBook = useAppSelector(
    (state) => state.orderBook[VENUES.POLYMARKET],
  );
  const kalshiBook = useAppSelector((state) => state.orderBook[VENUES.KALSHI]);

  const polyWsRef = useRef<WebSocket | null>(null);
  const kalshiWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<{
    poly?: NodeJS.Timeout;
    kalshi?: NodeJS.Timeout;
  }>({});
  const connectPolymarketWsRef = useRef<() => void>(() => {});
  const connectKalshiWsRef = useRef<() => void>(() => {});

  const cleanupPolymarket = useCallback(() => {
    if (polyWsRef.current) {
      polyWsRef.current.close();
      polyWsRef.current = null;
    }
    if (reconnectTimeoutRef.current.poly) {
      clearTimeout(reconnectTimeoutRef.current.poly);
    }
  }, []);

  const cleanupKalshi = useCallback(() => {
    if (kalshiWsRef.current) {
      kalshiWsRef.current.close();
      kalshiWsRef.current = null;
    }
    if (reconnectTimeoutRef.current.kalshi) {
      clearTimeout(reconnectTimeoutRef.current.kalshi);
    }
  }, []);

  const connectPolymarketWs = useCallback(() => {
    if (!market?.polymarket?.clobTokenIds?.yes) return;

    console.log("[Polymarket Hook] Connecting to Polymarket WebSocket...");

    dispatch(
      connectionActions.setConnectionStatus({
        venue: VENUES.POLYMARKET,
        status: CONNECTION_STATUS.CONNECTING,
      }),
    );

    const tokenId = market.polymarket.clobTokenIds.yes;

    polyWsRef.current = createPolymarketWebSocket(
      [tokenId],
      (data) => {
        const parsed = parsePolymarketOrderBook(data);
        dispatch(
          orderBookActions.updateOrderBook({
            venue: VENUES.POLYMARKET,
            bids: parsed.bids,
            asks: parsed.asks,
          }),
        );
      },
      () => {
        console.error("[Polymarket Hook] WebSocket error occurred");
        dispatch(
          connectionActions.setConnectionStatus({
            venue: VENUES.POLYMARKET,
            status: CONNECTION_STATUS.ERROR,
            errorMessage: ERROR_MESSAGES.WEBSOCKET_ERROR,
          }),
        );
        dispatch(
          connectionActions.incrementReconnectAttempts(VENUES.POLYMARKET),
        );

        if (
          polymarketConnection.reconnectAttempts <
          WS_CONFIG.maxReconnectAttempts
        ) {
          console.log(
            `[Polymarket Hook] Scheduling reconnect attempt ${polymarketConnection.reconnectAttempts + 1}/${WS_CONFIG.maxReconnectAttempts}`,
          );
          reconnectTimeoutRef.current.poly = setTimeout(() => {
            connectPolymarketWsRef.current();
          }, WS_CONFIG.reconnectIntervalMs);
        } else {
          console.error("[Polymarket Hook] Max reconnect attempts reached");
        }
      },
      () => {
        console.log("[Polymarket Hook] WebSocket connected successfully");
        dispatch(
          connectionActions.setConnectionStatus({
            venue: VENUES.POLYMARKET,
            status: CONNECTION_STATUS.CONNECTED,
          }),
        );
        dispatch(connectionActions.resetReconnectAttempts(VENUES.POLYMARKET));
      },
      (wasClean: boolean) => {
        console.log(`[Polymarket Hook] WebSocket closed. Clean: ${wasClean}`);

        dispatch(
          connectionActions.setConnectionStatus({
            venue: VENUES.POLYMARKET,
            status: CONNECTION_STATUS.DISCONNECTED,
          }),
        );

        // Only reconnect for abnormal closes
        if (!wasClean) {
          dispatch(
            connectionActions.incrementReconnectAttempts(VENUES.POLYMARKET),
          );

          if (
            polymarketConnection.reconnectAttempts <
            WS_CONFIG.maxReconnectAttempts
          ) {
            console.log(
              `[Polymarket Hook] Abnormal close detected. Scheduling reconnect attempt ${polymarketConnection.reconnectAttempts + 1}/${WS_CONFIG.maxReconnectAttempts}`,
            );
            reconnectTimeoutRef.current.poly = setTimeout(() => {
              connectPolymarketWsRef.current();
            }, WS_CONFIG.reconnectIntervalMs);
          } else {
            console.error(
              "[Polymarket Hook] Max reconnect attempts reached after close",
            );
          }
        }
      },
    );
  }, [market, dispatch, polymarketConnection.reconnectAttempts]);

  useEffect(() => {
    connectPolymarketWsRef.current = connectPolymarketWs;
  }, [connectPolymarketWs]);

  // Kalshi/DFlow WebSocket connection
  const connectKalshiWs = useCallback(async () => {
    const kalshiTicker = linkedKalshiMarket?.ticker || market?.kalshi?.ticker;
    if (!kalshiTicker) return;

    console.log("[Kalshi Hook] Connecting to Kalshi WebSocket...");

    dispatch(
      connectionActions.setConnectionStatus({
        venue: VENUES.KALSHI,
        status: CONNECTION_STATUS.CONNECTING,
      }),
    );

    kalshiWsRef.current = createKalshiWebSocket(
      [kalshiTicker],
      (data) => {
        const parsed = parseKalshiOrderBook(data);
        dispatch(
          orderBookActions.updateOrderBook({
            venue: VENUES.KALSHI,
            bids: parsed.bids,
            asks: parsed.asks,
          }),
        );
      },
      () => {
        console.error("[Kalshi Hook] WebSocket error occurred");
        dispatch(
          connectionActions.setConnectionStatus({
            venue: VENUES.KALSHI,
            status: CONNECTION_STATUS.ERROR,
            errorMessage: ERROR_MESSAGES.WEBSOCKET_ERROR,
          }),
        );
        dispatch(connectionActions.incrementReconnectAttempts(VENUES.KALSHI));

        if (
          kalshiConnection.reconnectAttempts < WS_CONFIG.maxReconnectAttempts
        ) {
          console.log(
            `[Kalshi Hook] Scheduling reconnect attempt ${kalshiConnection.reconnectAttempts + 1}/${WS_CONFIG.maxReconnectAttempts}`,
          );
          reconnectTimeoutRef.current.kalshi = setTimeout(() => {
            connectKalshiWsRef.current();
          }, WS_CONFIG.reconnectIntervalMs);
        } else {
          console.error("[Kalshi Hook] Max reconnect attempts reached");
        }
      },
      async () => {
        console.log("[Kalshi Hook] WebSocket connected successfully");
        
        // Fetch initial orderbook via REST (DFlow WS only sends updates, not snapshots)
        try {
          console.log("[Kalshi Hook] Fetching initial orderbook via REST...");
          const orderbookData = await fetchKalshiOrderBook(kalshiTicker);
          const parsed = parseKalshiOrderBook(orderbookData);
          dispatch(
            orderBookActions.updateOrderBook({
              venue: VENUES.KALSHI,
              bids: parsed.bids,
              asks: parsed.asks,
            }),
          );
          console.log("[Kalshi Hook] Initial orderbook loaded");
        } catch (error) {
          console.error("[Kalshi Hook] Failed to fetch initial orderbook:", error);
        }
        
        dispatch(
          connectionActions.setConnectionStatus({
            venue: VENUES.KALSHI,
            status: CONNECTION_STATUS.CONNECTED,
          }),
        );
        dispatch(connectionActions.resetReconnectAttempts(VENUES.KALSHI));
      },
      (wasClean: boolean) => {
        console.log(`[Kalshi Hook] WebSocket closed. Clean: ${wasClean}`);

        // Always set status to disconnected
        dispatch(
          connectionActions.setConnectionStatus({
            venue: VENUES.KALSHI,
            status: CONNECTION_STATUS.DISCONNECTED,
          }),
        );

        // Only reconnect for abnormal closes (not clean disconnects)
        if (!wasClean) {
          dispatch(connectionActions.incrementReconnectAttempts(VENUES.KALSHI));

          if (
            kalshiConnection.reconnectAttempts < WS_CONFIG.maxReconnectAttempts
          ) {
            console.log(
              `[Kalshi Hook] Abnormal close detected. Scheduling reconnect attempt ${kalshiConnection.reconnectAttempts + 1}/${WS_CONFIG.maxReconnectAttempts}`,
            );
            reconnectTimeoutRef.current.kalshi = setTimeout(() => {
              connectKalshiWsRef.current();
            }, WS_CONFIG.reconnectIntervalMs);
          } else {
            console.error(
              "[Kalshi Hook] Max reconnect attempts reached after close",
            );
          }
        }
      },
    );
  }, [
    market,
    linkedKalshiMarket,
    dispatch,
    kalshiConnection.reconnectAttempts,
  ]);

  useEffect(() => {
    connectKalshiWsRef.current = connectKalshiWs;
  }, [connectKalshiWs]);

  useEffect(() => {
    if (!enabled || !market) {
      cleanupPolymarket();
      cleanupKalshi();
      dispatch(orderBookActions.clearAllOrderBooks());
      return;
    }

    // Connect Polymarket WebSocket
    if (market.polymarket) {
      connectPolymarketWs();
    }

    // Connect Kalshi/DFlow WebSocket
    if (market.kalshi || linkedKalshiMarket) {
      connectKalshiWs();
    }

    return () => {
      cleanupPolymarket();
      cleanupKalshi();
    };
  }, [
    enabled,
    market,
    linkedKalshiMarket,
    cleanupPolymarket,
    cleanupKalshi,
    connectPolymarketWs,
    connectKalshiWs,
    dispatch,
  ]);

  return {
    polymarket: {
      status: polymarketConnection.status,
      orderBook: polymarketBook,
      isConnected: polymarketConnection.status === CONNECTION_STATUS.CONNECTED,
    },
    kalshi: {
      status: kalshiConnection.status,
      orderBook: kalshiBook,
      isConnected: kalshiConnection.status === CONNECTION_STATUS.CONNECTED,
    },
  };
}
