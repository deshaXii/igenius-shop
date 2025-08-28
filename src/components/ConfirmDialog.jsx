import React from "react";
import Modal from "./Modal";
import Button from "./Button";

const ConfirmDialog = ({ open, onClose, onConfirm, message }) => {
  return (
    <Modal isOpen={open} onClose={onClose}>
      <p className="mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <Button onClick={onClose} className="bg-gray-400 hover:bg-gray-500">
          إلغاء
        </Button>
        <Button onClick={onConfirm} className="bg-red-500 hover:bg-red-600">
          تأكيد
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
