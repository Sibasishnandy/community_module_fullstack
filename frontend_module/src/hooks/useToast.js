import { useState, useRef, useCallback } from "react";

export function useToast() {
  const [toast, setToast] = useState({ message: "", isError: false });
  const timerRef = useRef(null);

  const showToast = useCallback((message, isError = false) => {
    clearTimeout(timerRef.current);
    setToast({ message, isError });
    timerRef.current = setTimeout(
      () => setToast({ message: "", isError: false }),
      2800
    );
  }, []);

  return { toast, showToast };
}
