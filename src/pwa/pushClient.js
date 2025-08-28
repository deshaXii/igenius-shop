import API from "../lib/api";

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// نادى دي بعد تسجيل الدخول أو من زر "تفعيل الإشعارات"
export async function enablePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("المتصفح لا يدعم الإشعارات");
  }

  // لازم الـ SW يبقى جاهز
  const reg = await navigator.serviceWorker.ready;

  // الإذن
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("تم رفض إذن الإشعارات");

  // اشتراك
  const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublic) throw new Error("VAPID public key مفقودة");

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // خزّن/حدّث الاشتراك في السيرفر
    await API.post("/push/subscribe", { subscription: existing });
    return true;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublic),
  });

  await API.post("/push/subscribe", { subscription: sub });
  return true;
}
