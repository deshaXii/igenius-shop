import React from "react";

const RepairStats = ({ totalRepairs, totalProfit, totalPartsCost }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded p-4 mb-4 shadow text-sm">
      <h3 className="font-bold mb-2">إحصائيات الصيانات</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          عدد الصيانات: <strong>{totalRepairs}</strong>
        </div>
        <div>
          إجمالي الربح: <strong>{totalProfit} ج</strong>
        </div>
        <div>
          إجمالي تكلفة القطع: <strong>{totalPartsCost} ج</strong>
        </div>
      </div>
    </div>
  );
};

export default RepairStats;
