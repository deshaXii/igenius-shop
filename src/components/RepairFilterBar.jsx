import React from "react";

const RepairFilterBar = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  technicianFilter,
  setTechnicianFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  sortBy,
  setSortBy,
  technicians,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 grid md:grid-cols-6 gap-2 text-sm">
      <input
        type="text"
        placeholder="بحث بالاسم / الهاتف / الجهاز"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border rounded px-2 py-1 w-full"
      />

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="border rounded px-2 py-1"
      >
        <option value="">كل الحالات</option>
        <option value="في الانتظار">في الانتظار</option>
        <option value="جاري العمل">جاري العمل</option>
        <option value="مكتمل">مكتمل</option>
        <option value="مرفوض">مرفوض</option>
        <option value="تم التسليم">تم التسليم</option>
      </select>

      <select
        value={technicianFilter}
        onChange={(e) => setTechnicianFilter(e.target.value)}
        className="border rounded px-2 py-1"
      >
        <option value="">كل الفنيين</option>
        {technicians.map((t) => (
          <option key={t._id} value={t._id}>
            {t.name}
          </option>
        ))}
      </select>

      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="border rounded px-2 py-1"
      />

      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="border rounded px-2 py-1"
      />

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="border rounded px-2 py-1"
      >
        <option value="newest">الأحدث أولاً</option>
        <option value="oldest">الأقدم أولاً</option>
        <option value="priceHigh">السعر الأعلى</option>
        <option value="priceLow">السعر الأقل</option>
        <option value="name">اسم العميل</option>
      </select>
    </div>
  );
};

export default RepairFilterBar;
