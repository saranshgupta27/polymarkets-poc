import type { AppDispatch, AppStore, RootState } from "@/store";
import { useDispatch, useSelector, useStore } from "react-redux";

// Typed versions of Redux hooks
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
