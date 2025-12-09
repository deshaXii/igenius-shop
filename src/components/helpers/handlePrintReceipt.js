import { SHOP } from "../../utils/data";

// ======== طباعة إيصال الضمان ========
export default function HandlePrintReceipt(rep) {
  if (!rep) return;
  const win = window.open("", "_blank", "width=800,height=900");
  const warrantyTxt =
    rep?.hasWarranty && rep?.warrantyEnd
      ? `ضمان حتى: ${formatDate(rep.warrantyEnd)}`
      : "— لا يوجد تاريخ ضمان محدد —";

  const html = `
<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<title>إيصال ضمان — #${rep.repairId ?? "-"}</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif; margin:24px; color:#111;}
  .hdr{display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:16px;}
  .shop h1{margin:0; font-size:20px}
  .shop div{font-size:12px; opacity:.8}
  .meta{font-size:12px; text-align:left}
  h2{font-size:16px; margin:16px 0 8px}
  table{width:100%; border-collapse:collapse}
  th,td{border:1px solid #ddd; padding:8px; font-size:13px}
  .note{margin-top:12px; font-size:12px; opacity:.8}
  .footer{margin-top:18px; font-size:12px; text-align:center}
  .badge{display:inline-block; padding:2px 8px; border-radius:8px; background:#f5f5f5; font-size:12px}
</style>
</head>
<body>
  <div class="hdr">
    <div class="shop">
      <h1>${SHOP.name}</h1>
      <div>الهاتف: ${SHOP.phone}</div>
      <div>العنوان: ${SHOP.address}</div>
    </div>
    <div class="meta">
      <div>رقم الصيانة: #${rep.repairId ?? "-"}</div>
      <div>التاريخ: ${formatDate(new Date().toISOString())}</div>
      <div class="badge">${rep.status || ""}</div>
    </div>
  </div>

  <h2>بيانات العميل</h2>
  <table>
    <tr><th>الاسم</th><td>${rep.customerName || "—"}</td></tr>
    <tr><th>الهاتف</th><td>${rep.phone || "—"}</td></tr>
  </table>

  <h2>بيانات الجهاز</h2>
  <table>
    <tr><th>النوع</th><td>${rep.deviceType || "—"}</td></tr>
    <tr><th>اللون</th><td>${rep.color || "—"}</td></tr>
    <tr><th>العطل</th><td>${rep.issue || "—"}</td></tr>
    <tr><th>السعر المتفق عليه</th><td>${
      hasNum(rep.price) ? Number(rep.price) : "—"
    }</td></tr>
    <tr><th>السعر النهائي</th><td>${
      hasNum(rep.finalPrice)
        ? Number(rep.finalPrice)
        : hasNum(rep.price)
        ? Number(rep.price)
        : "—"
    }</td></tr>
    <tr><th>الضمان</th><td>${warrantyTxt}</td></tr>
  </table>

  <div class="note"><strong>ملاحظات الضمان:</strong> ${SHOP.warrantyNote}</div>
  <div class="footer">${SHOP.footer}</div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
