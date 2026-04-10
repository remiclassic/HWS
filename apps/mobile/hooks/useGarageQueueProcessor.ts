import { useCallback, useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { processGarageQueue } from "../lib/garageMutationQueue";
import { getIsOnline, useOnline } from "../lib/network";

export function useGarageQueueProcessor(): void {
  const qc = useQueryClient();
  const online = useOnline();

  const flush = useCallback(async () => {
    if (!(await getIsOnline())) return;
    const n = await processGarageQueue();
    if (n > 0) await qc.invalidateQueries({ queryKey: ["garage"] });
  }, [qc]);

  useEffect(() => {
    if (!online) return;
    void flush();
  }, [online, flush]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active") void flush();
    });
    return () => sub.remove();
  }, [flush]);
}
