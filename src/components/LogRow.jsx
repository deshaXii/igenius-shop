import { TYPE_AR } from "../utils/data";
import { describeLog } from "./helpers/describeLog";

export default function LogRow({ log, deps, flows }) {
  const { summary, details } = describeLog(log, { deps, flows });
  const timeTxt = new Date(
    log.at || log.createdAt || Date.now()
  ).toLocaleString("ar-EG");
  return (
    <div className="flex align-top">
      <div className="py-2 px-2 whitespace-nowrap">{timeTxt}</div>
      <div className="py-2 px-2 whitespace-nowrap">
        {TYPE_AR[log.type] || log.type}
      </div>
      <div className="py-2 px-2">
        <div>{summary}</div>
        {Array.isArray(details) && details.length > 0 && (
          <ul className="list-disc pr-5 mt-1 space-y-1">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
