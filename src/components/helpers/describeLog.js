import { friendlyField, STATUS_AR_FULL } from "../../utils/data";
import { renderVal } from "./renderVal";

export function describeLog(log, { deps = [], flows = [] } = {}) {
  const p = log?.payload || {};
  const depById = new Map(deps.map((d) => [String(d._id), d]));
  const flowById = new Map(flows.map((f) => [String(f._id), f]));
  const out = { summary: "", details: [], partsChange: null };

  switch (log?.type) {
    case "create":
      out.summary = "تم إنشاء الصيانة";
      break;

    case "status_change": {
      const st = STATUS_AR_FULL[p.status] || p.status || "—";
      out.summary = `تم تغيير الحالة إلى «${st}»`;
      break;
    }

    case "assign_technician": {
      const f = p.flowId ? flowById.get(String(p.flowId)) : null;
      const depName =
        f?.department?.name ||
        depById.get(String(f?.department))?.name ||
        "قسم";
      const techName =
        f?.technician?.name ||
        p.technicianName ||
        (p.technicianId
          ? `الفنّي (#${String(p.technicianId).slice(-4)})`
          : "—");
      out.summary = `تم تعيين «${techName}» على خطوة قسم «${depName}»`;
      break;
    }

    case "flow_complete": {
      const f = p.flowId ? flowById.get(String(p.flowId)) : null;
      const depName =
        f?.department?.name ||
        depById.get(String(f?.department))?.name ||
        "قسم";
      out.summary = `اكتملت خطوة قسم «${depName}»`;
      if (Number.isFinite(Number(p.price)))
        out.details.push(`سعر القسم: ${Number(p.price).toFixed(2)} جنيه`);
      if (p.notes) out.details.push(`ملاحظات: ${p.notes}`);
      break;
    }

    case "move_next": {
      const depName = depById.get(String(p.departmentId))?.name || "—";
      out.summary = `تم نقل الصيانة إلى قسم «${depName}»`;
      break;
    }

    case "update": {
      out.summary = "تم تعديل البيانات";
      const changes = Array.isArray(p.changes) ? p.changes : [];
      for (const c of changes) {
        if (c.field === "parts") {
          out.partsChange = { fromVal: c.from, toVal: c.to };
          continue;
        }
        const label = friendlyField(c.field);
        const fromTxt = renderVal(c.from);
        const toTxt = renderVal(c.to);
        out.details.push(`${label}: من «${fromTxt}» إلى «${toTxt}»`);
      }
      break;
    }

    case "delete":
      out.summary = "تم حذف الصيانة";
      break;

    default:
      out.summary = TYPE_AR[log?.type] || log?.type || "—";
      if (p && Object.keys(p).length) out.details.push(JSON.stringify(p));
  }

  return out;
}
