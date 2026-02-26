# Quick Code Guide for Interview

Simple explanations of every key function in the codebase.

---

## 📦 lib/orderbook.ts (Business Logic)

### `aggregateOrderBooks(polymarket, kalshi)`
**What it does**: Combines order books from both venues

**How**:
1. Create empty map: `price -> { totalSize, breakdown }`
2. Loop through Polymarket orders, add to map
3. Loop through Kalshi orders, merge or add to map
4. Return sorted arrays (bids high→low, asks low→high)

**Example**:
```
Polymarket: 5¢ bid for $100
Kalshi: 5¢ bid for $50
Result: 5¢ bid for $150 (breakdown: PM $100, Kalshi $50)
```

**Time**: O(n + m) where n, m = number of orders

---

### `getBestPrices(aggregated)`
**What it does**: Finds best bid, best ask, spread, mid price

**How**:
- Best bid = first item in bids array (already sorted highest first)
- Best ask = first item in asks array (already sorted lowest first)
- Spread = bestAsk - bestBid
- Mid = (bestBid + bestAsk) / 2

**Example**:
```
Best bid: 48¢
Best ask: 52¢
Spread: 4¢
Mid: 50¢
```

---

### `convertBidsToNoAsks(bids, venue)` (Helper)
**What it does**: Converts YES bids into NO asks

**Why**: When buying NO, you're taking liquidity from people buying YES

**How**:
- YES bid at 10¢ → NO ask at 90¢
- Size adjustment: Same dollar value, different share count
- Formula: `noSize = yesSize * noPrice / yesPrice`

**Example**:
```
YES bid: 10¢ for $100 = 1000 shares
NO equivalent: 90¢ for $100 = 111 shares
```

---

### `getOrdersForOutcome(outcome, polymarket, kalshi)` (Helper)
**What it does**: Gets all relevant orders for YES or NO

**For YES**: Return all asks (people selling YES), sorted cheapest first

**For NO**:
1. Get all bids (people buying YES)
2. Convert to NO prices using `convertBidsToNoAsks()`
3. Sort cheapest first

**Returns**: Array of orders with venue attached

---

### `calculateQuote(dollarAmount, outcome, polymarket, kalshi)`
**What it does**: "How many shares can I buy for $X?"

**Algorithm**:
1. Get all orders for chosen outcome (YES or NO)
2. Sort by price (cheapest first)
3. Loop through orders, buying from cheapest:
   - Calculate shares: `dollarAmount / pricePerShare`
   - Track fills per venue
   - Subtract from remaining dollars
4. Calculate average price: `totalSpent / totalShares * 100`
5. Return result with breakdown

**Example**:
```
Input: $100, YES outcome
Available orders:
  - 3¢ for $20 (get 666 shares)
  - 4¢ for $50 (get 1250 shares)
  - 5¢ for $30 (get 600 shares)
Result: 2516 shares at 3.97¢ avg
```

**Edge cases handled**:
- Prices too low (<0.5¢): Skip
- Shares too high (>1M): Skip
- Division by zero: Check with `isFinite()`
- Invalid results: Return null

---

## 🔌 api/polymarket.ts

### `fetchPolymarketMarkets(query, limit)`
**What it does**: Search for markets

**API**: GET `/markets?_q={query}&_limit={limit}`

**Returns**: Array of markets

---

### `fetchPolymarketOrderBook(tokenId)`
**What it does**: Get current order book for a specific market

**API**: GET `/book?token_id={tokenId}`

**Returns**: Raw order book data (needs parsing)

---

### `parsePolymarketOrderBook(data)`
**What it does**: Convert API format to our internal format

**Conversion**:
- API: prices in 0.0-1.0 range (e.g., 0.5 = 50%)
- Internal: prices in 0-100 cents (e.g., 50¢ = 50%)
- Formula: `apiPrice * 100` then round to 0.1¢

**Example**:
```
API: { price: "0.967", size: "100" }
Internal: { price: 96.7, size: 100, venue: "POLYMARKET" }
```

---

### `createPolymarketWebSocket(tokenIds, callbacks)`
**What it does**: Opens real-time connection for live updates

**Process**:
1. Create WebSocket connection
2. Send subscription message: `{ type: "market", assets_ids: [tokenId] }`
3. Start heartbeat (send ping every 30s)
4. On message: Parse and call `onMessage()` callback
5. On close: Stop heartbeat, call `onClose()` callback

**Message handling**:
- Filter for messages with `bids` and `asks` (full snapshots)
- Ignore other messages (price changes, errors, etc.)

---

## 🔌 api/kalshi.ts

### `fetchKalshiOrderBook(ticker)`
**What it does**: Get order book from DFlow API

**API**: GET `/orderbook/{ticker}`

**Returns**: Raw DFlow format with `yes_bids` and `no_bids`

---

### `parseKalshiOrderBook(data)`
**What it does**: Convert DFlow format to internal format

**Key insight**: DFlow separates YES and NO bids
- `yes_bids`: People buying YES = our bids
- `no_bids`: People buying NO = people selling YES = our asks

**Conversion**:
```
yes_bids: { "0.50": 100 } → bid at 50¢ for $100
no_bids: { "0.30": 50 } → ask at 70¢ for $50 (100 - 30)
```

**Why the math**:
- If NO is at 30¢, then YES must be at 70¢ (they sum to 100¢)

---

### `createKalshiWebSocket(tickers, callbacks)`
**What it does**: Opens real-time connection to DFlow

**Subscription message**:
```json
{
  "type": "subscribe",
  "channel": "orderbook",
  "tickers": ["TRUMP-2025"]
}
```

**Message handling**:
- Ignore `pong` responses (reply to our heartbeat)
- Process `orderbook` channel messages
- Call `onMessage()` with data

---

## 🪝 hooks/useVenueWebSocket.ts

### `useOrderBookData({ market, enabled })`
**What it does**: Manages WebSocket connections for both venues

**Flow**:
1. Check if enabled and market selected
2. Connect to Polymarket WebSocket
3. Connect to Kalshi WebSocket
4. On message: Parse → dispatch to Redux
5. On error: Update connection status to ERROR
6. On close: Check if clean, attempt reconnect if needed
7. Cleanup: Close connections on unmount

**Reconnection logic**:
- Wait 5 seconds
- Try again (max 10 attempts)
- Stop if clean close (code 1000)

**React hooks used**:
- `useEffect`: Connection lifecycle
- `useRef`: Store WebSocket objects (persist across renders)
- `useCallback`: Memoize callbacks (prevent infinite loops)
- `useDispatch`: Send data to Redux

---

## 🗂️ store/slices.ts

### `orderBookSlice`
**State**: `{ polymarket: VenueOrderBook, kalshi: VenueOrderBook }`

**Actions**:
- `updateOrderBook(venue, bids, asks)`: Replace order book for venue

---

### `connectionSlice`
**State**: `{ polymarket: ConnectionState, kalshi: ConnectionState }`

**ConnectionState**:
- status: "connecting" | "connected" | "disconnected" | "error"
- lastConnected: timestamp
- reconnectAttempts: number

**Actions**:
- `setConnectionStatus(venue, status)`: Update connection state
- `incrementReconnectAttempts(venue)`: Track retry count
- `resetReconnectAttempts(venue)`: Reset after successful connection

---

### `quoteSlice`
**State**: `{ amount: number, outcome: "YES" | "NO" }`

**Actions**:
- `setAmount(amount)`: User enters dollar amount
- `setOutcome(outcome)`: User selects YES or NO

---

### `marketSlice`
**State**: `{ selectedMarket: Market | null }`

**Actions**:
- `setSelectedMarket(market)`: Select which market to view

---

## 🎨 Key Components

### `OrderBook.tsx`
**What it shows**: Two-column order book display

**Layout**:
- Left: Bids (buyers) - green
- Right: Asks (sellers) - red
- Bottom: Spread and mid price

**Props**: `viewMode` (Combined | Polymarket | Kalshi)

---

### `QuoteCalculator.tsx`
**What it does**: Interactive quote calculator

**Flow**:
1. User enters amount ($100)
2. User selects outcome (YES/NO)
3. Component calls `calculateQuote()`
4. Displays: total shares, avg price, breakdown per venue

---

### `ConnectionStatus.tsx`
**What it shows**: Connection indicators for each venue

**Colors**:
- 🟢 Green: Connected
- 🟡 Yellow: Connecting
- 🔴 Red: Error
- ⚪ Gray: Disconnected

---

### `MarketView.tsx`
**What it does**: Main container component

**Responsibilities**:
1. Load hardcoded market on mount
2. Start WebSocket connections via `useOrderBookData()`
3. Layout all child components

---

## 🧩 Data Flow Summary

```
1. User loads app
   ↓
2. MarketView mounts
   ↓
3. useOrderBookData() starts WebSockets
   ↓
4. WebSocket sends data
   ↓
5. parsePolymarketOrderBook() / parseKalshiOrderBook()
   ↓
6. dispatch(updateOrderBook())
   ↓
7. Redux store updates
   ↓
8. Components re-render with new data
   ↓
9. aggregateOrderBooks() merges data
   ↓
10. UI displays combined order book
```

---

## 💡 Quick Interview Answers

### "How does aggregation work?"
"I use a HashMap to merge orders by price level. Iterate both venue arrays, add to map keyed by price, track breakdown per venue. O(n+m) time complexity."

### "How do you handle YES vs NO?"
"For YES, I use asks (sellers). For NO, I convert bids (YES buyers = NO sellers) by inverting price: 100 - bidPrice. Size also adjusts proportionally."

### "Why WebSocket instead of polling?"
"Lower latency, less bandwidth, real-time updates. I add heartbeat pings every 30s to keep connection alive."

### "How does quote calculator work?"
"Greedy algorithm: sort all orders by price, fill from cheapest upward until dollars run out. Track fills per venue, calculate average price."

### "What edge cases do you handle?"
"Extreme prices (<0.5¢), division by zero, invalid numbers (NaN/Infinity), unrealistic share counts (>1M), empty results."

### "How do you manage state?"
"Redux Toolkit for global state. Order books, connection status, selected market, user inputs all in Redux. Components subscribe via selectors."

### "What happens on disconnect?"
"Check if clean close. If not, wait 5s and retry. Track attempts, max 10. Update connection status to show user. Clear heartbeat interval."

---

## 🎯 Core Concepts to Remember

1. **Cents not dollars**: All prices stored as 0-100 integers, avoids float errors
2. **YES/NO complementary**: Price add to 100¢, share counts differ
3. **Venue breakdown**: Always track which venue fills what
4. **Sorting matters**: Bids high→low, asks low→high
5. **WebSocket lifecycle**: open → subscribe → heartbeat → message → close
6. **Edge case checks**: Always validate isFinite(), check extremes
7. **Redux flow**: WebSocket → parse → dispatch → store → component

---

## ⏱️ Time Complexity Reference

| Function | Time | Space |
|----------|------|-------|
| aggregateOrderBooks | O(n + m) | O(n + m) |
| calculateQuote | O(k log k) | O(k) |
| parseOrderBook | O(n) | O(n) |
| getBestPrices | O(1) | O(1) |

Where:
- n, m = number of orders per venue
- k = total orders across venues

---

## 🚀 Before Interview Checklist

- [ ] Can explain aggregation algorithm
- [ ] Understand YES/NO price relationship
- [ ] Know why bids for NO, not asks
- [ ] Can walk through quote calculation
- [ ] Understand WebSocket lifecycle
- [ ] Know Redux data flow
- [ ] Can explain edge cases handled
- [ ] Remember time complexity

**You got this!** 🎉
