import { configureStore } from "@reduxjs/toolkit";
import {
  connectionSlice,
  marketSlice,
  orderBookSlice,
  quoteSlice,
} from "./slices";

export const makeStore = () => {
  return configureStore({
    reducer: {
      orderBook: orderBookSlice.reducer,
      connection: connectionSlice.reducer,
      quote: quoteSlice.reducer,
      market: marketSlice.reducer,
    },
    devTools: process.env.NODE_ENV !== "production",
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
