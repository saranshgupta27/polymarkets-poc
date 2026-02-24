import {
  CONNECTION_STATUS,
  OUTCOMES,
  OutcomeId,
  VENUES,
  VenueId,
} from "@/constants";
import {
  ConnectionStatus,
  Market,
  PriceLevel,
  VenueConnectionState,
  VenueOrderBook,
} from "@/types/orderbook";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";

interface OrderBookState {
  [VENUES.POLYMARKET]: VenueOrderBook;
  [VENUES.KALSHI]: VenueOrderBook;
}

const initialVenueOrderBook: VenueOrderBook = {
  bids: [],
  asks: [],
  lastUpdated: null,
};

const initialOrderBookState: OrderBookState = {
  [VENUES.POLYMARKET]: { ...initialVenueOrderBook },
  [VENUES.KALSHI]: { ...initialVenueOrderBook },
};

export const orderBookSlice = createSlice({
  name: "orderBook",
  initialState: initialOrderBookState,
  reducers: {
    updateOrderBook(
      state,
      action: PayloadAction<{
        venue: VenueId;
        bids: PriceLevel[];
        asks: PriceLevel[];
      }>,
    ) {
      const { venue, bids, asks } = action.payload;
      state[venue] = {
        bids: bids.sort((a, b) => b.price - a.price),
        asks: asks.sort((a, b) => a.price - b.price),
        lastUpdated: Date.now(),
      };
    },

    updatePriceLevel(
      state,
      action: PayloadAction<{
        venue: VenueId;
        side: "bid" | "ask";
        price: number;
        size: number;
      }>,
    ) {
      const { venue, side, price, size } = action.payload;
      const book = side === "bid" ? state[venue].bids : state[venue].asks;

      const existingIndex = book.findIndex((level) => level.price === price);

      if (size === 0) {
        if (existingIndex !== -1) {
          book.splice(existingIndex, 1);
        }
      } else if (existingIndex !== -1) {
        book[existingIndex].size = size;
      } else {
        book.push({ price, size, venue });
        if (side === "bid") {
          book.sort((a, b) => b.price - a.price);
        } else {
          book.sort((a, b) => a.price - b.price);
        }
      }

      state[venue].lastUpdated = Date.now();
    },

    clearOrderBook(state, action: PayloadAction<VenueId>) {
      state[action.payload] = { ...initialVenueOrderBook };
    },

    clearAllOrderBooks(state) {
      state[VENUES.POLYMARKET] = { ...initialVenueOrderBook };
      state[VENUES.KALSHI] = { ...initialVenueOrderBook };
    },
  },
});

interface ConnectionState {
  [VENUES.POLYMARKET]: VenueConnectionState;
  [VENUES.KALSHI]: VenueConnectionState;
}

const initialVenueConnection: VenueConnectionState = {
  status: CONNECTION_STATUS.DISCONNECTED,
  lastConnected: null,
  errorMessage: null,
  reconnectAttempts: 0,
};

const initialConnectionState: ConnectionState = {
  [VENUES.POLYMARKET]: { ...initialVenueConnection },
  [VENUES.KALSHI]: { ...initialVenueConnection },
};

export const connectionSlice = createSlice({
  name: "connection",
  initialState: initialConnectionState,
  reducers: {
    setConnectionStatus(
      state,
      action: PayloadAction<{
        venue: VenueId;
        status: ConnectionStatus;
        errorMessage?: string;
      }>,
    ) {
      const { venue, status, errorMessage } = action.payload;
      state[venue].status = status;

      if (status === CONNECTION_STATUS.CONNECTED) {
        state[venue].lastConnected = Date.now();
        state[venue].errorMessage = null;
        state[venue].reconnectAttempts = 0;
      } else if (status === CONNECTION_STATUS.ERROR && errorMessage) {
        state[venue].errorMessage = errorMessage;
      }
    },

    incrementReconnectAttempts(state, action: PayloadAction<VenueId>) {
      state[action.payload].reconnectAttempts += 1;
    },

    resetReconnectAttempts(state, action: PayloadAction<VenueId>) {
      state[action.payload].reconnectAttempts = 0;
    },
  },
});

interface QuoteState {
  amount: number;
  outcome: OutcomeId;
  isCalculating: boolean;
}

const initialQuoteState: QuoteState = {
  amount: 100,
  outcome: OUTCOMES.YES,
  isCalculating: false,
};

export const quoteSlice = createSlice({
  name: "quote",
  initialState: initialQuoteState,
  reducers: {
    setAmount(state, action: PayloadAction<number>) {
      state.amount = action.payload;
    },
    setOutcome(state, action: PayloadAction<OutcomeId>) {
      state.outcome = action.payload;
    },
    setIsCalculating(state, action: PayloadAction<boolean>) {
      state.isCalculating = action.payload;
    },
  },
});

interface MarketState {
  selectedMarket: Market | null;
}

const initialMarketState: MarketState = {
  selectedMarket: null,
};

export const marketSlice = createSlice({
  name: "market",
  initialState: initialMarketState,
  reducers: {
    setSelectedMarket(state, action: PayloadAction<Market | null>) {
      state.selectedMarket = action.payload;
    },
  },
});

export const orderBookActions = orderBookSlice.actions;
export const connectionActions = connectionSlice.actions;
export const quoteActions = quoteSlice.actions;
export const marketActions = marketSlice.actions;
