"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, UserCheck, CreditCard, Activity, RefreshCw, BarChart2, ShieldAlert } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

interface AIUsageAnalytics {
  total_api_calls: number;
  total_tokens_consumed: number;
  total_costs_incurred_usd: number;
  agent_breakdown: {
    agent: string;
    calls: number;
    tokens: number;
  }[];
}

interface RevenueAnalytics {
  active_subscribers: number;
  monthly_recurring_revenue_inr: number;
}

interface AuditLogItem {
  id: string;
  user_id: string;
  action: string;
  ip_address: string;
  details: Record<string, any>;
  timestamp: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [aiStats, setAiStats] = useState<AIUsageAnalytics | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAdminData = async () => {
    try {
      const [users, ai, rev, audits] = await Promise.all([
        api.get<AdminUser[]>("/admin/users"),
        api.get<AIUsageAnalytics>("/admin/analytics/ai"),
        api.get<RevenueAnalytics>("/admin/analytics/revenue"),
        api.get<AuditLogItem[]>("/admin/audit-logs"),
      ]);

      setUsersList(users);
      setAiStats(ai);
      setRevenueStats(rev);
      setAuditLogs(audits);
    } catch (e: any) {
      setError(e.message || "Failed to load administrative analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAdminData();
    }
  }, [user]);

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await api.post(`/admin/users/${userId}/role?role=${newRole}`);
      // Refresh list
      const updated = usersList.map(u => u.id === userId ? { ...u, role: newRole } : u);
      setUsersList(updated);
    } catch (err: any) {
      alert(err.message || "Failed to change user role");
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 bg-[#04060d]">
        <div className="glass p-8 rounded-2xl border-red-500/20 text-center max-w-lg mx-auto space-y-4">
          <ShieldAlert className="h-12 w-12 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Access Denied</h3>
          <p className="text-slate-400 text-sm">This workspace area requires administrator privileges.</p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#04060d]">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-slate-400 text-sm">Loading admin audits logs & usage statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 bg-[#04060d] space-y-8 relative">
      <div className="glow-bg top-0 right-10" />

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <ShieldCheck className="h-8 w-8 text-amber-500" />
            <span>Admin Console</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Platform analytics, token tracking, revenue audits, and security logs.</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAdminData(); }}
          className="p-2 rounded-lg border border-[rgba(255,255,255,0.06)] hover:bg-slate-800/40 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl relative z-10">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics analytics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {/* Total API calls */}
        <div className="glass p-5 rounded-2xl flex flex-col justify-between h-28">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total AI Requests</span>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-white font-mono">{aiStats?.total_api_calls || 0}</span>
            <Activity className="h-5 w-5 text-indigo-400" />
          </div>
        </div>

        {/* Total Tokens */}
        <div className="glass p-5 rounded-2xl flex flex-col justify-between h-28">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Tokens Consumed</span>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-white font-mono">
              {(aiStats?.total_tokens_consumed || 0).toLocaleString()}
            </span>
            <BarChart2 className="h-5 w-5 text-indigo-400" />
          </div>
        </div>

        {/* Costs */}
        <div className="glass p-5 rounded-2xl flex flex-col justify-between h-28">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">AI API Costs</span>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-white font-mono">
              ${(aiStats?.total_costs_incurred_usd || 0.0).toFixed(4)}
            </span>
            <CreditCard className="h-5 w-5 text-indigo-400" />
          </div>
        </div>

        {/* Active subscriptions */}
        <div className="glass p-5 rounded-2xl flex flex-col justify-between h-28">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Monthly Revenue (MRR)</span>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-amber-500 font-mono">
              ₹{(revenueStats?.monthly_recurring_revenue_inr || 0).toLocaleString()}
            </span>
            <UserCheck className="h-5 w-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Main Grid: User registers & logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* User Management list */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl space-y-4">
          <h3 className="text-md font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center space-x-1.5">
            <UserCheck className="h-4.5 w-4.5 text-indigo-400" />
            <span>User Accounts Manager</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-500 border-b border-[rgba(255,255,255,0.04)] font-semibold uppercase">
                  <th className="py-2">Email</th>
                  <th className="py-2">Verification</th>
                  <th className="py-2">Billing Role</th>
                  <th className="py-2 text-right">Actions Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                {usersList.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-800/10">
                    <td className="py-3 font-semibold text-slate-200">{usr.email}</td>
                    <td className="py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        usr.is_verified ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
                      }`}>
                        {usr.is_verified ? "VERIFIED" : "PENDING"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-indigo-400 uppercase">{usr.role}</span>
                    </td>
                    <td className="py-3 text-right">
                      <select
                        value={usr.role}
                        onChange={(e) => handleChangeRole(usr.id, e.target.value)}
                        className="bg-slate-900 border border-[rgba(255,255,255,0.08)] rounded p-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="free">Free Tier</option>
                        <option value="premium">Premium Tier</option>
                        <option value="admin">System Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Audit Trails */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <h3 className="text-md font-bold text-white border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center space-x-1.5">
            <Activity className="h-4.5 w-4.5 text-indigo-400" />
            <span>Audit Trail Log</span>
          </h3>
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-8">No security actions recorded in current session.</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-900/40 border border-[rgba(255,255,255,0.06)] text-[10px] space-y-1">
                  <div className="flex justify-between items-center font-semibold text-slate-300">
                    <span className="text-indigo-400 uppercase tracking-wider">{log.action}</span>
                    <span className="font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-400 text-left font-mono">IP: {log.ip_address}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


