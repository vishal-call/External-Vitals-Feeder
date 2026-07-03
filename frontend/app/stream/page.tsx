"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Square, Activity, Send } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const scenarios = [
  "Stable Adult",
  "Slow Deterioration",
  "Sudden Hypoxia",
  "Severe Tachycardia",
  "Septic Pattern",
];

export default function LiveFeeder() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [patientCode, setPatientCode] = useState("PT-1001");
  const [scenario, setScenario] = useState("Stable Adult");
  const [interval, setIntervalTime] = useState("5");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  const [vitalsData, setVitalsData] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8100";

  useEffect(() => {
    fetch(`${apiUrl}/api/devices`)
      .then(res => res.json())
      .then(data => {
        setDevices(data);
        if (data.length > 0) setSelectedDevice(data[0].device_code);
      });
  }, [apiUrl]);

  // Polling for live data when streaming
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if (isStreaming) {
      pollInterval = setInterval(async () => {
        const res = await fetch(`${apiUrl}/api/logs?limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0 && data[0].session_id === sessionId) {
            const payload = JSON.parse(data[0].payload_json);
            const time = new Date(data[0].sent_at).toLocaleTimeString();
            setVitalsData(prev => [...prev.slice(-19), {
              time,
              hr: payload.heart_rate,
              spo2: payload.spo2
            }]);
            setLogs(prev => [...prev.slice(-9), `[${time}] HTTP ${data[0].http_status || 'ERR'} - ${data[0].status}`]);
          }
        }
      }, 1000); // Poll every second for demo smoothness
    }
    return () => clearInterval(pollInterval);
  }, [isStreaming, sessionId, apiUrl]);

  const handleStart = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/streams/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: selectedDevice,
          patient_code: patientCode,
          scenario,
          interval_seconds: parseInt(interval)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session_id);
        setIsStreaming(true);
        toast.success("Stream started successfully");
      }
    } catch (e) {
      toast.error("Failed to start stream");
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;
    try {
      await fetch(`${apiUrl}/api/streams/${sessionId}/stop`, { method: "POST" });
      setIsStreaming(false);
      setSessionId(null);
      toast.info("Stream stopped");
    } catch (e) {
      toast.error("Failed to stop stream");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <Activity className="text-emerald-500 h-8 w-8" />
          Live Feeder
        </h2>
        <p className="text-slate-400 mt-2">Configure and monitor real-time vital streams.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800 text-slate-100 lg:col-span-1">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Device</Label>
              <Select value={selectedDevice} onValueChange={(val) => setSelectedDevice(val as string)} disabled={isStreaming}>
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Select Device" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  {devices.map(d => (
                    <SelectItem key={d.device_code} value={d.device_code}>{d.device_name} ({d.device_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Patient Code</Label>
              <Input 
                value={patientCode} 
                onChange={(e) => setPatientCode(e.target.value)} 
                disabled={isStreaming}
                className="bg-slate-950 border-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label>Clinical Scenario</Label>
              <Select value={scenario} onValueChange={(val) => setScenario(val as string)} disabled={isStreaming}>
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Select Scenario" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  {scenarios.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Interval (seconds)</Label>
              <Input 
                type="number" 
                value={interval} 
                onChange={(e) => setIntervalTime(e.target.value)} 
                disabled={isStreaming}
                className="bg-slate-950 border-slate-800"
              />
            </div>

            <div className="flex gap-2 pt-4">
              {!isStreaming ? (
                <Button onClick={handleStart} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Play className="mr-2 h-4 w-4" /> Start Stream
                </Button>
              ) : (
                <Button onClick={handleStop} variant="destructive" className="flex-1">
                  <Square className="mr-2 h-4 w-4" /> Stop Stream
                </Button>
              )}
            </div>
            {!isStreaming && (
              <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                <Send className="mr-2 h-4 w-4" /> Send Single Reading
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-emerald-500 font-mono text-xl">MONITOR: {selectedDevice}</CardTitle>
              {isStreaming && <div className="h-3 w-3 bg-rose-500 rounded-full animate-pulse" />}
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitalsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" hide />
                  <YAxis yAxisId="left" domain={[40, 200]} stroke="#22c55e" />
                  <YAxis yAxisId="right" orientation="right" domain={[60, 100]} stroke="#0ea5e9" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="hr" stroke="#22c55e" strokeWidth={3} dot={false} isAnimationActive={false} name="Heart Rate" />
                  <Line yAxisId="right" type="monotone" dataKey="spo2" stroke="#0ea5e9" strokeWidth={3} dot={false} isAnimationActive={false} name="SpO2 %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-slate-100">
            <CardHeader>
              <CardTitle className="text-sm">Transmission Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-950 p-4 rounded-md font-mono text-sm h-32 overflow-y-auto text-emerald-400 border border-slate-800">
                {logs.length === 0 ? (
                  <span className="text-slate-600">Waiting for data...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
