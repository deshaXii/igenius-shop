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
  className,
}) => (
  <div className="w-full input-field">
    {label && <label className="block mb-1 font-semibold">{label}</label>}
    <input
      type={type}
      name={name}
      disabled={disabled}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  </div>
);

export default InputField;
