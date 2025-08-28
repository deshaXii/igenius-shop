import { useEffect } from "react";

const usePageTitle = (title) => {
  useEffect(() => {
    document.title = `${title} | Aqsa System`;
  }, [title]);
};

export default usePageTitle;
