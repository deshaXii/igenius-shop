import React from "react";

const InputField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  disabled,
  className = "",
}) => (
  <div className="w-full input-field mb-3">
    {label && (
      <label className="block mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </label>
    )}
    <input
      type={type}
      name={name}
      disabled={disabled}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className={`w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-[16px] text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 ${className}`}
    />
  </div>
);

export default InputField;
