import React from "react";

const Notification = ({ type = "info", message }) => {
  const colors = {
    error: "bg-red-200 text-red-800",
    success: "bg-green-200 text-green-800",
    info: "bg-blue-200 text-blue-800",
  };

  return <div className={`p-2 mb-2 rounded ${colors[type]}`}>{message}</div>;
};

export default Notification;
