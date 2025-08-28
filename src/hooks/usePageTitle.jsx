import { useEffect } from "react";

const usePageTitle = (title) => {
  useEffect(() => {
    document.title = `${title} | IGenius System`;
  }, [title]);
};

export default usePageTitle;
