import React from "react";

const Dropdown = ({ label, value, onChange, options, required }) => {
  return (
    <div className="mb-4">
      {label && <label className="block mb-1 font-semibold">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full p-2 rounded border dark:bg-gray-800 dark:text-white"
      >
        <option value="">اختر...</option>
        {options.map((opt) => (
          <option key={opt.value || opt._id} value={opt.value || opt._id}>
            {opt.label || opt.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;
