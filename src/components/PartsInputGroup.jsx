import React from "react";

const PartsInputGroup = ({ value = [], onChange }) => {
  const handleChange = (index, field, val) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...value, { name: "", source: "", cost: 0 }]);
  };

  const handleRemove = (index) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">قطع الغيار</label>
      {value.map((part, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="اسم القطعة"
            value={part.name}
            onChange={(e) => handleChange(i, "name", e.target.value)}
            className="border p-1 rounded w-1/3"
          />
          <input
            type="text"
            placeholder="بواسطة"
            value={part.source}
            onChange={(e) => handleChange(i, "source", e.target.value)}
            className="border p-1 rounded w-1/3"
          />
          <input
            type="number"
            placeholder="السعر"
            value={part.cost}
            onChange={(e) => handleChange(i, "cost", Number(e.target.value))}
            className="border p-1 rounded w-1/4"
          />
          <button
            type="button"
            onClick={() => handleRemove(i)}
            className="bg-red-500 text-white px-2 rounded"
          >
            X
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="bg-green-500 text-white px-3 py-1 rounded"
      >
        + إضافة قطعة
      </button>
    </div>
  );
};

export default PartsInputGroup;
