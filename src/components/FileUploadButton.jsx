import React, { useRef } from "react";

const FileUploadButton = ({ onFileSelect }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <>
      <button
        type="button"
        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
        onClick={() => fileInputRef.current.click()}
      >
        استيراد نسخة
      </button>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".json"
        onChange={handleFileChange}
      />
    </>
  );
};

export default FileUploadButton;
