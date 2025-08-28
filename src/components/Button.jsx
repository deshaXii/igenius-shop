import React from "react";

const Button = ({ children, ...props }) => (
  <button
    {...props}
    className={`px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 ${
      props.className || ""
    }`}
  >
    {children}
  </button>
);

export default Button;
