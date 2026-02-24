export const VENUES = {
  POLYMARKET: "polymarket",
  KALSHI: "kalshi",
} as const;

export const VENUE_DISPLAY_NAMES: Record<VenueId, string> = {
  [VENUES.POLYMARKET]: "Polymarket",
  [VENUES.KALSHI]: "Kalshi",
};

export const CONNECTION_STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
} as const;

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatusId, string> = {
  [CONNECTION_STATUS.CONNECTING]: "Connecting",
  [CONNECTION_STATUS.CONNECTED]: "Connected",
  [CONNECTION_STATUS.DISCONNECTED]: "Disconnected",
  [CONNECTION_STATUS.ERROR]: "Error",
};

export const VIEW_MODES = {
  COMBINED: "combined",
  POLYMARKET: "polymarket",
  KALSHI: "kalshi",
} as const;

export const VIEW_MODE_LABELS: Record<ViewModeId, string> = {
  [VIEW_MODES.COMBINED]: "Combined",
  [VIEW_MODES.POLYMARKET]: "Polymarket",
  [VIEW_MODES.KALSHI]: "Kalshi",
};

export const OUTCOMES = {
  YES: "yes",
  NO: "no",
} as const;

export const OUTCOME_LABELS: Record<OutcomeId, string> = {
  [OUTCOMES.YES]: "Yes",
  [OUTCOMES.NO]: "No",
};

export const UI_LABELS = {
  DATA_SOURCES: "Data Sources",
  GET_QUOTE: "Get Quote",
  SELECT_OUTCOME: "Select Outcome",
  AMOUNT_TO_SPEND: "Amount to Spend",
  SEARCH_MARKETS: "Search markets...",
  CLEAR: "Clear",
  FILL_BREAKDOWN: "Fill Breakdown",
  YOU_WOULD_RECEIVE: "You would receive",
  SHARES: "shares",
  AVG_PRICE: "Avg price",
  PER_SHARE: "per share",
  CALCULATE_SHARES: "Calculate how many shares you can buy",
  LEVELS: "levels",
  NEVER: "Never",
  VOLUME: "Volume",
  ORDER_BOOK: "Order Book",
  PRICE: "Price",
  SIZE: "Size",
  SPREAD: "Spread",
  MID: "Mid",
};

export const ERROR_MESSAGES = {
  WEBSOCKET_ERROR: "WebSocket error",
  FAILED_TO_FETCH: "Failed to fetch",
};

export type VenueId = (typeof VENUES)[keyof typeof VENUES];
export type ConnectionStatusId =
  (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];
export type ViewModeId = (typeof VIEW_MODES)[keyof typeof VIEW_MODES];
export type OutcomeId = (typeof OUTCOMES)[keyof typeof OUTCOMES];
