import React from "react";

const RepairFilter = ({ filters, onChange }) => {
  const handleChange = (e) => {
    onChange({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-wrap gap-4 mb-4 bg-white dark:bg-gray-800 p-4 rounded shadow">
      <input
        name="customerName"
        value={filters.customerName}
        onChange={handleChange}
        placeholder="اسم العميل"
        className="p-2 border rounded w-40"
      />
      <input
        name="deviceType"
        value={filters.deviceType}
        onChange={handleChange}
        placeholder="نوع الجهاز"
        className="p-2 border rounded w-40"
      />
      <select
        name="status"
        value={filters.status}
        onChange={handleChange}
        className="p-2 border rounded w-40"
      >
        <option value="">كل الحالات</option>
        <option value="في الانتظار">في الانتظار</option>
        <option value="جاري العمل">جاري العمل</option>
        <option value="مكتمل">مكتمل</option>
        <option value="تم التسليم">تم التسليم</option>
        <option value="مرفوض">مرفوض</option>
      </select>
      <select
        name="sort"
        value={filters.sort}
        onChange={handleChange}
        className="p-2 border rounded w-40"
      >
        <option value="latest">الأحدث أولاً</option>
        <option value="oldest">الأقدم أولاً</option>
        <option value="priceHigh">الأعلى سعراً</option>
        <option value="priceLow">الأقل سعراً</option>
      </select>
    </div>
  );
};

export default RepairFilter;
