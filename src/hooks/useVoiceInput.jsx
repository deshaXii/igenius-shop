import { useState } from "react";

const useVoiceInput = (lang = "ar-EG") => {
  const [listening, setListening] = useState(false);

  const startListening = (onResult) => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("المتصفح لا يدعم تحويل الصوت إلى نص");
      return;
    }

    const recognition = new webkitSpeechRecognition(); // eslint-disable-line no-undef
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    recognition.start();
  };

  return { startListening, listening };
};

export default useVoiceInput;
