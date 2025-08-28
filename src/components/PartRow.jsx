import React from "react";

const PartRow = ({ part, onChange, onDelete }) => {
  return (
    <div className="flex gap-2 items-center mb-2">
      <input
        type="text"
        value={part.name}
        onChange={(e) => onChange("name", e.target.value)}
        placeholder="اسم القطعة"
        className="border p-1 rounded w-1/3"
      />
      <input
        type="text"
        value={part.source}
        onChange={(e) => onChange("source", e.target.value)}
        placeholder="بواسطة"
        className="border p-1 rounded w-1/3"
      />
      <input
        type="number"
        value={part.cost}
        onChange={(e) => onChange("cost", parseFloat(e.target.value))}
        placeholder="السعر"
        className="border p-1 rounded w-1/4"
      />
      <button
        type="button"
        onClick={onDelete}
        className="text-red-500 font-bold"
        title="حذف"
      >
        ✖
      </button>
    </div>
  );
};

export default PartRow;
