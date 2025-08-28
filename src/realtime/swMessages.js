// src/realtime/swMessages.js

export function bindServiceWorkerMessages() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("message", (event) => {
    const { type, payload } = event.data || {};
    if (type === "PUSH_EVENT") {
      // أو ابعت حدث عام:
      window.dispatchEvent(
        new CustomEvent("repairs:refresh", { detail: payload })
      );
    }
  });
}
