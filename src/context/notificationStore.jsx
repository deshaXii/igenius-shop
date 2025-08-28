import { create } from "zustand";

const useNotificationStore = create((set) => ({
  message: null,
  type: "info", // success | error | warning
  showMessage: (msg, type = "info") => {
    set({ message: msg, type });
    setTimeout(() => set({ message: null }), 3000);
  },
}));

export default useNotificationStore;
