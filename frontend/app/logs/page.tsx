"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8100";

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/logs?limit=50`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {
      toast.error("Failed to fetch logs");
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleResend = async (logId: number) => {
    try {
      const res = await fetch(`${apiUrl}/api/logs/${logId}/resend`, { method: 'POST' });
      if (res.ok) {
        toast.success("Payload queued for resending");
        setTimeout(fetchLogs, 1000);
      }
    } catch (e) {
      toast.error("Failed to resend");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Transmission Logs</h2>
          <p className="text-slate-400 mt-2">Historical records of HTTP transmissions to HospitalAI.</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950">
              <TableRow className="border-slate-800 hover:bg-slate-950/50">
                <TableHead className="text-slate-400">Time</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Device/Patient</TableHead>
                <TableHead className="text-slate-400">HTTP</TableHead>
                <TableHead className="text-slate-400">Idempotency Key</TableHead>
                <TableHead className="text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-mono text-xs">{new Date(log.sent_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      log.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                      log.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{log.device_id}</div>
                    <div className="text-xs text-slate-500">{log.patient_code}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{log.http_status || '-'}</div>
                    {log.error_message && <div className="text-xs text-rose-400 max-w-[200px] truncate" title={log.error_message}>{log.error_message}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{log.idempotency_key.split('-')[0]}...</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleResend(log.id)} className="hover:bg-slate-800 hover:text-white">
                      Resend
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
