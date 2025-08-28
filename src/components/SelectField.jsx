import React from "react";

const SelectField = ({
  label,
  value,
  onChange,
  options = [],
  required,
  name,
}) => {
  return (
    <div className="mb-4">
      {label && <label className="block mb-1 font-semibold">{label}</label>}
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border px-3 py-2 rounded bg-white dark:bg-gray-800"
      >
        <option value="">-- اختر --</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value || opt._id}>
            {opt.label || opt.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectField;
