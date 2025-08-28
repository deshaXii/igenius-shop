import React, { useEffect } from "react";

const NotificationSystem = ({ notifications, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notifications.length) onRemove(notifications[0].id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [notifications, onRemove]);

  if (!notifications.length) return null;

  return (
    <div className="fixed top-4 left-4 z-50 space-y-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`px-4 py-2 rounded shadow text-white ${
            n.type === "error" ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {n.message}
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
