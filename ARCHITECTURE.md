# Prediction Market Aggregator Architecture

## Overview
This application aggregates order books from **Polymarket** and **Kalshi** prediction markets, allowing users to see combined liquidity and execute trades across both venues.

### What is a Prediction Market?
- Markets where you bet on **real-world outcomes** (e.g., "Will Trump deport < 250k people in 2025?")
- Two binary outcomes: **YES** (happens) or **NO** (doesn't happen)
- Price = probability in cents (e.g., 65¢ = 65% chance YES happens, 35% chance NO happens)
- When you **buy YES at 65¢**, you pay 65 cents per share
- If YES resolves true, each share is worth $1.00

---

## Architecture Layers

### 1. **API Layer** (`api/`)
Handles all external API communication.

#### `api/polymarket.ts`
- **Polymarket CLOB** (Central Limit Order Book)
- Functions:
  - `fetchPolymarketOrderBook(tokenId)` - REST API call for current prices
  - `parsePolymarketOrderBook()` - Convert raw API response to internal format
  - `createPolymarketWebSocket()` - Establish WebSocket for real-time updates
- Key Detail: Converts prices from decimals (0.65) to cents (65)

#### `api/kalshi.ts`
- **Kalshi via DFlow API** - Access to Kalshi markets
- Functions:
  - `fetchKalshiOrderBook(ticker)` - REST API
  - `parseKalshiOrderBook()` - Convert to internal format
  - `createKalshiWebSocket()` - Real-time connection
- Key Detail: Markets identified by ticker (e.g., "KXFEDCHAIRNOM-29-JS")

---

### 2. **State Management** (`store/`)

#### Redux Store Structure
```
store = {
  orderBook: {
    polymarket: {
      bids: [{ price: 65, size: 100, venue: "polymarket" }, ...],
      asks: [{ price: 70, size: 50, venue: "polymarket" }, ...],
      lastUpdated: timestamp
    },
    kalshi: { ... }
  },
  connection: {
    polymarket: {
      status: "connected" | "disconnected" | "connecting" | "error",
      reconnectAttempts: 0,
      errorMessage: null
    },
    kalshi: { ... }
  },
  market: {
    selectedMarket: { ... }
  },
  quote: {
    amount: 100,
    outcome: "yes"
  }
}
```

#### Slices (`store/slices.ts`)
- **orderBookSlice**: Updates price levels when data arrives
  - `updateOrderBook()` - Replace entire book (from REST poll or WS snapshot)
  - `updatePriceLevel()` - Update single price (from WS incremental update)
- **connectionSlice**: Tracks connection state
  - `setConnectionStatus()` - Update connection state
  - `incrementReconnectAttempts()` - Increment retry counter
- **quoteSlice**: Stores user input for quote calculator

---

### 3. **Business Logic** (`lib/orderbook.ts`)

#### Key Functions

**aggregateOrderBooks(polymarket, kalshi)**
- Combines order books from both venues
- Creates price map, merges duplicate prices across venues
- Returns `{ bids: [], asks: [] }` sorted by price
- Example: If Polymarket has 100 shares at 65¢ and Kalshi has 50 at 65¢, show 150 total at 65¢

**getBestPrices(aggregated)**
- Returns best bid, best ask, spread, mid price
- **Spread** = best ask - best bid (smaller = better liquidity)
- **Mid price** = (best bid + best ask) / 2 (fair market price estimate)

**calculateQuote(amountToSpend, outcome, polymarket, kalshi)**
- Core algorithm for quote calculator
- User says "I want to spend $100 on YES"
- Function returns:
  - How many shares you get
  - Average price paid
  - Which venue fills which portion
  - Breakdown of fills

**Price Transformation (Key Concept)**
- When buying **NO outcome**: Price transforms as `newPrice = 100 - oldPrice`
- For example: If YES is 65¢, then NO is 35¢
- Shares also transform: `newSize = oldSize × (100 - oldPrice) / oldPrice`
  - Why? The dollar value of the order must match

---

### 4. **WebSocket Management** (`hooks/useVenueWebSocket.ts`)

#### `useOrderBookData` Hook
Manages WebSocket lifecycle for both venues.

**Connection Flow**
```
user opens app → useEffect → connectPolymarketWs → new WebSocket
→ ws.onopen → send subscription message
→ ws.onmessage → parse → dispatch Redux action
→ Component re-renders with new data
```

**Reconnection Logic**
- WebSocket closes (abnormally)
- Hook detects via `wasClean` parameter
- If abnormal close: `setTimeout(reconnect, 5000)`
- Max 10 attempts, then give up

**Heartbeat Mechanism**
- Every 30 seconds, send `{ type: "ping" }` to keep connection alive
- Prevents server timeout (typical timeout: 60s)
- Interval cleared on disconnect

---

### 5. **UI Components** (`components/`)

#### `MarketView` (Container)
- Loads hardcoded market on mount
- Calls `useOrderBookData` hook
- Renders child components:
  - MarketHeader
  - ViewModeSelector
  - OrderBook
  - QuoteCalculator
  - ConnectionStatus

#### `OrderBook` (Display)
- Two-column layout: Bids (left) | Asks (right)
- Shows aggregated data from both venues
- Color-coded by venue (blue = Polymarket, gray = Kalshi)
- Displays spread and mid price

#### `QuoteCalculator` (Interaction)
- Input: Amount in dollars
- Select: YES or NO outcome
- Output:
  - Total shares
  - Average price
  - Venue breakdown
  - Individual fills

#### `ConnectionStatus` (Status Indicator)
- Shows connection state for each venue
- Displays error messages if connection fails

---

## Data Flow

### Real-Time Updates
```
1. User opens app
2. useOrderBookData hook connects to both WebSockets
3. Server sends initial orderbook snapshot
4. parsePolymarketOrderBook() converts to internal format
5. dispatch(orderBookActions.updateOrderBook()) updates Redux
6. Component selectors trigger re-render
7. New data appears on screen
```

### Trade Quote Generation
```
1. User enters "$100" and selects "YES"
2. dispatch(quoteActions.setAmount(100))
3. QuoteCalculator component calls calculateQuote()
4. Function fills from best ask first, then next best, etc.
5. Returns shares, average price, breakdown
6. Component displays results
```

---

## Types

### Core Types (`types/orderbook.ts`)

```typescript
// Single price level from one venue
PriceLevel = {
  price: number              // in cents
  size: number               // in dollars
  venue: "polymarket" | "kalshi"
}

// Aggregated level from both venues
AggregatedPriceLevel = {
  price: number
  totalSize: number
  breakdown: {
    polymarket: number
    kalshi: number
  }
}

// Order book snapshot
VenueOrderBook = {
  bids: PriceLevel[]
  asks: PriceLevel[]
  lastUpdated: number | null
}
```

---

## Configuration

### Markets (`constants/markets.ts`)
- Maps market question to exchange-specific IDs
- Polymarket uses `conditionId` + `clobTokenIds`
- Kalshi uses `ticker`
- Currently hardcoded with one example market

### API Endpoints (`config/api.ts`)
- Polymarket: `https://clob.polymarket.com`
- Kalshi/DFlow: `https://dev-prediction-markets-api.dflow.net/api/v1`
- WebSocket URLs for both

### WebSocket Config
- Reconnect interval: 5 seconds
- Max attempts: 10
- Heartbeat interval: 30 seconds

---

## Key Algorithms

### Quote Calculation
```
algorithm calculateQuote(amount, outcome, polyBook, kalshiBook):
  if outcome == YES:
    askLevels = combine and sort asks from both venues by price
  else:
    askLevels = transform NO prices: 100 - price
                transform NO sizes: size * (100-price) / price
    ask levels transformed to ascending order

  fills = []
  remaining = amount
  totalShares = 0

  for each askLevel in askLevels:
    if remaining == 0: break

    spend = min(remaining, askLevel.size)
    shares = spend / (askLevel.price / 100)

    totalShares += shares
    remaining -= spend
    fills.append({ venue, price, size: spend, shares })

  averagePrice = totalAmount / totalShares
  return { totalShares, averagePrice, fills }
```

### Orderbook Aggregation
```
algorithm aggregateOrderBooks(poly, kalshi):
  priceMap = {}

  for each level in poly.bids:
    if priceMap[level.price] exists:
      priceMap[level.price].totalSize += level.size
      priceMap[level.price].breakdown.polymarket += level.size
    else:
      priceMap[level.price] = { price, totalSize: size, breakdown: { poly: size, kalshi: 0 } }

  // Repeat for kalshi
  // Sort by price descending for bids, ascending for asks
  return { bids, asks }
```

---

## Error Handling

### WebSocket Errors
- `onError` triggers → set status to ERROR
- Display error message in UI
- Will attempt reconnect on next abnormal close

### API Errors
- Network failure → throw error
- Catch in component → set status to ERROR
- Display message with retry option

### Edge Cases Handled
- Extreme prices near 0¢ or 100¢ (filtered out during NO transformation)
- Division by zero (pre-check `priceInDollars > 0.005`)
- Unrealistic share quantities (cap at 1M to prevent display bugs)
- Prices with decimal precision (round to 0.1¢)

