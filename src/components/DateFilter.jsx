import React, { useState } from "react";

const DateFilter = ({ onFilter }) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const handleFilter = () => {
    onFilter(start, end);
  };

  return (
    <div className="flex gap-2 items-end mb-4">
      <div>
        <label className="block mb-1 text-sm">من تاريخ</label>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      <div>
        <label className="block mb-1 text-sm">إلى تاريخ</label>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      <button
        type="button"
        onClick={handleFilter}
        className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
      >
        فلترة
      </button>
    </div>
  );
};

export default DateFilter;
