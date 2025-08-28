import React, { useState } from "react";

const PasswordPrompt = ({ onSubmit, onCancel }) => {
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(password);
    setPassword("");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-4 rounded shadow w-80"
      >
        <h3 className="font-bold mb-2 text-center">أدخل كلمة المرور للتأكيد</h3>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border w-full p-2 mb-3 rounded"
          placeholder="كلمة المرور"
          required
        />
        <div className="flex justify-between">
          <button
            type="submit"
            className="bg-green-500 text-white px-3 py-1 rounded"
          >
            تأكيد
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-400 text-white px-3 py-1 rounded"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordPrompt;
