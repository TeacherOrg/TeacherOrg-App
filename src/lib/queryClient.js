// lib/queryClient.js - Globaler QueryClient für TanStack React Query
import { QueryClient } from '@tanstack/react-query';

// ✅ GLOBALER QUERYCLIENT (einmalig für die ganze App)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 Minuten Standard-Cache
      retry: 1,
      refetchOnWindowFocus: false, // Optional: vermeidet unnötige Refetches beim Tab-Wechsel
    },
  },
});
