import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toast, type ToastState } from "../components/ui/Toast";

/** Clears the floating tab bar and its raised Scan button. */
const TOAST_ABOVE_TAB_BAR = 96;

type ToastInput = Omit<ToastState, "id">;

type ToastApi = {
  show: (toast: ToastInput) => void;
  /** Shorthand for a failure message in the danger tone. */
  showError: (title: string, error?: unknown) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * App-wide transient feedback. Use instead of `Alert.alert` for messages that need no
 * decision — button-less alerts are a no-op on web.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const seq = useRef(0);

  const show = useCallback((t: ToastInput) => {
    seq.current += 1;
    setToast({ ...t, id: seq.current });
  }, []);
  const showError = useCallback(
    (title: string, error?: unknown) =>
      show({ tone: "danger", message: error == null ? title : `${title}: ${errorText(error)}` }),
    [show],
  );
  const dismiss = useCallback(() => setToast(null), []);

  const api = useMemo(() => ({ show, showError, dismiss }), [show, showError, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toast toast={toast} onDismiss={dismiss} bottomOffset={insets.bottom + TOAST_ABOVE_TAB_BAR} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
