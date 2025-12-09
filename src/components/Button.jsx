import React from "react";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm text-[16px] transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed";

const variantClasses = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm",
  secondary:
    "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700",
  outline:
    "border border-gray-300 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-100 hover:bg-gray-100/70 dark:hover:bg-gray-900/70",
  ghost:
    "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100/70 dark:hover:bg-gray-900/70",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
};

const sizeClasses = {
  xs: "px-2.5 py-1 text-xs",
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}) => {
  const v = variantClasses[variant] || variantClasses.primary;
  const s = sizeClasses[size] || sizeClasses.md;

  return (
    <button {...rest} className={`${baseClasses} ${v} ${s} ${className}`}>
      {children}
    </button>
  );
};

export default Button;
