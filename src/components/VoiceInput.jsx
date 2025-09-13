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
      className={`p-2 rounded ${
        listening ? "bg-green-500" : "bg-gray-300"
      } hover:bg-gray-400 rounded-full`}
    >
      🎤
    </button>
  );
};

export default VoiceInput;
