import { create } from "zustand";

const useThemeStore = create((set) => ({
  dark: localStorage.getItem("theme") === "dark",
  toggleTheme: () =>
    set((state) => {
      const newDark = !state.dark;
      localStorage.setItem("theme", newDark ? "dark" : "light");
      if (newDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { dark: newDark };
    }),
}));

export default useThemeStore;
