import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24,
      // Retry transient failures (token mid-refresh, brief network blips) before
      // flipping the UI into an error state.
      retry: 2,
      retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 3000),
      refetchOnWindowFocus: false,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "hotwheels_rq_cache",
  throttleTime: 1000,
});
