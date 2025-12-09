import React, { useState } from "react";

const VoiceInput = ({ onText, lang = "ar-EG" }) => {
  const [listening, setListening] = useState(false);

  const handleVoice = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("المتصفح لا يدعم تحويل الصوت إلى نص");
      return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onText(transcript);
    };

    recognition.start();
  };

  return (
    <button
      onClick={handleVoice}
      type="button"
      title="تسجيل صوتي"
      className={`inline-flex items-center justify-center h-9 w-9 rounded-full border text-base transition-all ${
        listening
          ? "bg-green-500 border-green-500 text-white shadow-lg scale-105"
          : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      🎤
    </button>
  );
};

export default VoiceInput;
