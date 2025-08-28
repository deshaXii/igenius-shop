import React from "react";

const AudioPlayer = ({ src }) => {
  return (
    <audio controls className="w-full mt-2">
      <source src={src} type="audio/mpeg" />
      متصفحك لا يدعم تشغيل الصوت
    </audio>
  );
};

export default AudioPlayer;
