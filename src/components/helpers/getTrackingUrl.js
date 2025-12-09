export default function GetTrackingUrl(rep) {
  const token = rep?.publicTracking?.token;
  return token ? `${window.location.origin}/t/${token}` : "";
}
