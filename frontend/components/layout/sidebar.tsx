"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Settings, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Live Feeder", href: "/stream", icon: Activity },
  { name: "Transmission Logs", href: "/logs", icon: ScrollText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 border-r border-slate-800 text-slate-300">
      <div className="flex h-16 items-center px-6 border-b border-slate-800 bg-slate-950">
        <Activity className="h-6 w-6 text-emerald-500 mr-3" />
        <span className="text-lg font-semibold text-white tracking-wide">Vitals Gateway</span>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-slate-800 text-emerald-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-600 text-center">
        External Vitals Feeder Simulator
      </div>
    </div>
  );
}
