import React, { useState } from "react";
import Button from "./Button.jsx";

const ModalConfirmPassword = ({ onConfirm, onCancel }) => {
  const [password, setPassword] = useState("");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow w-full max-w-sm">
        <h3 className="text-lg font-bold mb-2">تأكيد كلمة المرور</h3>
        <p className="text-sm mb-4">من فضلك أدخل كلمة مرورك لتأكيد التعديل</p>
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onCancel}>
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(password)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            تأكيد
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmPassword;
