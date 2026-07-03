"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, Server, XCircle } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_devices: 0,
    active_streams: 0,
    total_sent: 0,
    success_rate: 100,
  });
  
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchStats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8100";
      const [statsRes, logsRes] = await Promise.all([
        fetch(`${apiUrl}/api/stats`),
        fetch(`${apiUrl}/api/logs?limit=50`)
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      
      if (logsRes.ok) {
        const logs = await logsRes.json();
        // Group by time (minute level for simplicity in demo)
        const grouped = logs.reduce((acc: any, log: any) => {
          const time = new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (!acc[time]) acc[time] = { time, success: 0, failed: 0 };
          if (log.status === 'success') acc[time].success += 1;
          else acc[time].failed += 1;
          return acc;
        }, {});
        setChartData(Object.values(grouped).reverse());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
        <p className="text-slate-400 mt-2">Overview of the External Vitals Feeder Simulator</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Server className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_devices}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streams</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_streams}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vitals Sent</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_sent}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <XCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success_rate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle>Transmission Activity (Last 50 Logs)</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#475569" />
              <YAxis stroke="#475569" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
              <Area type="monotone" dataKey="success" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" />
              <Area type="monotone" dataKey="failed" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
