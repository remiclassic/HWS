import { useEffect, useState } from "react";
import { getGarageQueueLength, subscribeGarageQueue } from "../lib/garageMutationQueue";

export function useGarageQueueDepth(): number {
  const [n, setN] = useState(0);

  useEffect(() => {
    const refresh = () => void getGarageQueueLength().then(setN);
    refresh();
    return subscribeGarageQueue(refresh);
  }, []);

  return n;
}
