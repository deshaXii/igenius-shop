import React from "react";

const Loader = () => {
  return (
    <div className="text-center py-10">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-2">جاري التحميل...</p>
    </div>
  );
};

export default Loader;
