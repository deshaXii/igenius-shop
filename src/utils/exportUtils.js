// src/utils/exportUtils.js

// تصدير CSV (Excel بيفتحه عادي)
export function exportToCSV(filename, rows, columns) {
  // columns: [{key, label, transform?}]
  const header = columns
    .map((c) => `"${c.label.replace(/"/g, '""')}"`)
    .join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const v =
            typeof c.transform === "function"
              ? c.transform(row[c.key], row)
              : row[c.key];
          const s = v == null ? "" : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\n");

  const csv = header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// طباعة جدول مبني من rows/columns
export function printRows(title, rows, columns) {
  const head = columns
    .map(
      (c) =>
        `<th style="text-align:right;padding:6px;border-bottom:1px solid #ddd">${c.label}</th>`
    )
    .join("");
  const body = rows
    .map((row) => {
      const tds = columns
        .map((c) => {
          const v =
            typeof c.transform === "function"
              ? c.transform(row[c.key], row)
              : row[c.key];
          const s = v == null ? "" : String(v);
          return `<td style="padding:6px;border-bottom:1px solid #f0f0f0">${escapeHtml(
            s
          )}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  const html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Cairo, sans-serif; padding:16px;}
    h1{font-size:18px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <script>window.print()</script>
</body>
</html>`;
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s) {
  return s.replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}
