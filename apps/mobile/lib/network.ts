import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

export async function getIsOnline(): Promise<boolean> {
  const s = await NetInfo.fetch();
  if (s.isConnected === false) return false;
  if (s.isInternetReachable === false) return false;
  return true;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const apply = (s: { isConnected: boolean | null; isInternetReachable: boolean | null }) => {
      if (s.isConnected === false) {
        setOnline(false);
        return;
      }
      if (s.isInternetReachable === false) {
        setOnline(false);
        return;
      }
      setOnline(true);
    };

    const unsub = NetInfo.addEventListener(apply);
    void NetInfo.fetch().then(apply);
    return () => unsub();
  }, []);

  return online;
}
