"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, FlaskConical } from "lucide-react";

export default function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:8000");
  const [endpoint, setEndpoint] = useState("/api/patients/{patient_code}/vitals");
  const [apiKey, setApiKey] = useState("");
  
  const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8100";

  useEffect(() => {
    fetch(`${apiUrl}/api/settings`)
      .then(res => res.json())
      .then(data => {
        data.forEach((s: any) => {
          if (s.key === "HOSPITALAI_BASE_URL") setBaseUrl(s.value);
          if (s.key === "VITALS_ENDPOINT_PATH") setEndpoint(s.value);
          if (s.key === "INTEGRATION_API_KEY") setApiKey(s.value);
        });
      });
  }, [apiUrl]);

  const handleSave = async () => {
    try {
      await fetch(`${apiUrl}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "HOSPITALAI_BASE_URL", value: baseUrl, is_secret: false })
      });
      await fetch(`${apiUrl}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "VITALS_ENDPOINT_PATH", value: endpoint, is_secret: false })
      });
      await fetch(`${apiUrl}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "INTEGRATION_API_KEY", value: apiKey, is_secret: true })
      });
      toast.success("Settings saved successfully");
    } catch (e) {
      toast.error("Failed to save settings");
    }
  };

  const handleTestConnection = async () => {
    try {
      toast.info(`Asking backend to ping ${baseUrl}...`);
      const res = await fetch(`${apiUrl}/api/settings/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: baseUrl })
      });
      if (res.ok) {
        toast.success("Connection to HospitalAI successful!");
      } else {
        const errorData = await res.json();
        toast.error(`Connection failed: ${errorData.detail || 'HTTP Error'}`);
      }
    } catch (e) {
      toast.error("Connection failed: Network error or backend unreachable");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
        <p className="text-slate-400 mt-2">Configure the integration with HospitalAI.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription className="text-slate-400">Set the destination for the vitals payload.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>HospitalAI Base URL</Label>
            <Input 
              value={baseUrl} 
              onChange={(e) => setBaseUrl(e.target.value)} 
              className="bg-slate-950 border-slate-800"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Vitals Endpoint Path</Label>
            <Input 
              value={endpoint} 
              onChange={(e) => setEndpoint(e.target.value)} 
              className="bg-slate-950 border-slate-800"
            />
          </div>

          <div className="space-y-2">
            <Label>Integration API Key</Label>
            <Input 
              type="password"
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              className="bg-slate-950 border-slate-800"
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-800">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="mr-2 h-4 w-4" /> Save Settings
            </Button>
            <Button onClick={handleTestConnection} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <FlaskConical className="mr-2 h-4 w-4" /> Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
