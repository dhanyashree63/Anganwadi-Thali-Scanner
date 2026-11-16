import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAuditLogs(150)
      .then((data) => setLogs(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Immutable System Audit Trail
        </h1>
        <p className="text-sm text-slate-600">
          Chronological record of all officer verifications, portion corrections, norm changes, and dataset actions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading audit history...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User / Role</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Previous Value</th>
                  <th className="px-4 py-3">New Value</th>
                  <th className="px-4 py-3">Reason / Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{log.user_email}</div>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {log.user_role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-800">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {log.previous_value ? JSON.stringify(log.previous_value) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-800 max-w-xs truncate">
                      {log.new_value ? JSON.stringify(log.new_value) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium max-w-sm">
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
