import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

import SocketProvider from "./realtime/SocketProvider.jsx";
import NotificationsBridge from "./realtime/NotificationsBridge.jsx";

import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });
import { bindServiceWorkerMessages } from "./realtime/swMessages";
bindServiceWorkerMessages();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SocketProvider>
      <NotificationsBridge />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SocketProvider>
  </React.StrictMode>
);
