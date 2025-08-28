import React from "react";
import { Link } from "react-router-dom";

const RepairCard = ({ repair, onClick }) => {
  return (
    <div
      className="border rounded p-3 mb-2 shadow-sm bg-white dark:bg-gray-800 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">{repair.customerName}</h3>
        <span className="text-sm text-gray-500">{repair.status}</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        نوع الجهاز: {repair.deviceType}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        رقم الهاتف: {repair.phone}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        السعر: {repair.price} ج
      </p>
      <p className="font-bold">
        <Link
          to={`/repairs/${repair._id}`}
          className="text-blue-600 hover:underline"
        >
          {repair.customerName}
        </Link>
      </p>
    </div>
  );
};

export default RepairCard;
