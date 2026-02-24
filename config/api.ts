export const API_CONFIG = {
  polymarket: {
    baseUrl: "https://clob.polymarket.com",
    wsUrl: "wss://ws-subscriptions-clob.polymarket.com/ws/market",
  },
  dflow: {
    baseUrl: "https://dev-prediction-markets-api.dflow.net/api/v1",
    wsUrl: "wss://dev-prediction-markets-api.dflow.net/api/v1/ws",
  },
} as const;

export const WS_CONFIG = {
  reconnectIntervalMs: 5000,
  maxReconnectAttempts: 10,
  heartbeatIntervalMs: 30000,
} as const;
