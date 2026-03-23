import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Briefcase, Building2, BookOpen, Settings,
  CheckCircle2, AlertCircle, Clock, Flame, DollarSign, ArrowRight,
  Plus, Lock, ChevronRight, Shield, Users, Map, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const DEMO_LEADS = [
  { name: "BAKER ELIZABETH S", amount: "$467,865", county: "Maricopa, AZ" },
  { name: "CASTRONOVA WILLIAM", amount: "$640,665", county: "Maricopa, AZ" },
  { name: "WILSON DENNIS LEE", amount: "$471,869", county: "Maricopa, AZ" },
  { name: "AGUILERA RUBEN", amount: "$190,163", county: "Maricopa, AZ" },
  { name: "MULLINS JANANETTE", amount: "$273,753", county: "Maricopa, AZ" },
];

const PIPELINE_STAGES = ["Imported", "Agreement", "Info", "Notary", "Packet", "Filed", "Approved", "Paid", "Closed"];

const COMPLIANCE_DATA = [
  { state: "PA", feeCap: "20% (tax sale)", registration: "Required", hassle: 3 },
  { state: "AZ", feeCap: "30% (UCP)", registration: "PI license req.", hassle: 3 },
  { state: "GA", feeCap: "No specific cap", registration: "None", hassle: 2 },
  { state: "OH", feeCap: "Varies", registration: "None", hassle: 2 },
  { state: "CA", feeCap: "No specific cap", registration: "None", hassle: 1 },
];

function DisabledButton({ children, className = "" }) {
  return (
    <div className="relative group inline-block">
      <Button disabled className={`opacity-60 cursor-not-allowed ${className}`}>
        <Lock className="w-3 h-3 mr-1" />
        {children}
      </Button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        Sign up to unlock
      </div>
    </div>
  );
}

function HassleStars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full ${i <= rating ? "bg-amber-400" : "bg-slate-600"}`} />
      ))}
    </div>
  );
}

export default function Demo() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "case", icon: Briefcase, label: "Case Detail" },
    { id: "compliance", icon: Shield, label: "Compliance" },
    { id: "portal", icon: Users, label: "Client Portal" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Demo Banner */}
      <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2.5 flex items-center justify-between">
        <p className="text-amber-300 text-sm font-medium">
          🎯 <strong>DEMO MODE</strong> — You're viewing sample data. Sign up to access real leads and features.
        </p>
        <Link to={createPageUrl("AgentApply")}>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
            Get Started →
          </Button>
        </Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 flex-shrink-0 hidden md:flex flex-col">
          <div className="h-14 flex items-center px-5 border-b border-slate-800">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6935380f41db07237f45b1db/11ed7b05d_Screenshot_20251213_181447_Chrome.jpg"
              alt="TENNO"
              className="h-8 w-auto"
            />
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
              {[
                { icon: Building2, label: "Counties" },
                { icon: BookOpen, label: "How-To" },
                { icon: Settings, label: "Settings" },
              ].map(item => (
                <div key={item.label} className="relative group">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 cursor-not-allowed">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    <Lock className="w-3 h-3 ml-auto" />
                  </button>
                </div>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {/* Mobile tab bar */}
          <div className="md:hidden flex border-b border-slate-800 bg-slate-900">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 py-3 text-xs font-medium transition-colors ${
                  activeTab === item.id ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500"
                }`}
              >
                <item.icon className="w-4 h-4 mx-auto mb-1" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-4 lg:p-6">
            {/* TAB 1: Dashboard */}
            {activeTab === "dashboard" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                  <DisabledButton className="bg-emerald-600">+ New Case</DisabledButton>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[
                    { label: "Total Pipeline", value: "$847,235", color: "text-emerald-400" },
                    { label: "Active Cases", value: "12", color: "text-white" },
                    { label: "In Process", value: "4", color: "text-blue-400" },
                    { label: "Paid / Closed", value: "3", color: "text-emerald-400" },
                    { label: "Hot Cases 🔥", value: "5", color: "text-orange-400" },
                  ].map(kpi => (
                    <Card key={kpi.label} className="bg-slate-800 border-slate-700">
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-400 mb-1">{kpi.label}</p>
                        <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Today's Tasks */}
                  <div className="lg:col-span-2">
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" /> Today's Tasks
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { title: "Follow up with Robert Jones", sub: "Allegheny County • $45,218", urgent: true },
                          { title: "Agreement pending signature — Baker case", sub: "Maricopa, AZ • $467,865", urgent: true },
                          { title: "Notary documents overdue — Cuevas case", sub: "Maricopa, AZ • $176,617", urgent: false },
                        ].map((task, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${task.urgent ? "bg-amber-400" : "bg-slate-500"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{task.title}</p>
                              <p className="text-xs text-slate-400">{task.sub}</p>
                            </div>
                            <DisabledButton className="h-7 text-xs">Open</DisabledButton>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Lead Feed */}
                  <div>
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-base flex items-center gap-2">
                          <Flame className="w-4 h-4 text-orange-400" /> Lead Feed
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {DEMO_LEADS.map((lead, i) => (
                          <div key={i} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-700 space-y-1.5">
                            <p className="text-xs font-semibold text-white truncate">{lead.name}</p>
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-emerald-400 text-xs font-bold">{lead.amount}</p>
                                <p className="text-slate-500 text-xs">{lead.county}</p>
                              </div>
                              <DisabledButton className="h-6 text-xs bg-emerald-600">+ Add</DisabledButton>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: Case Detail */}
            {activeTab === "case" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">BAKER ELIZABETH S</h1>
                    <p className="text-slate-400 text-sm">Case #CV2024-032522 · Maricopa County, AZ</p>
                  </div>
                  <Badge className="bg-orange-500/20 text-orange-400 border-0">
                    <Flame className="w-3 h-3 mr-1" /> HOT
                  </Badge>
                </div>

                {/* Case Info */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400 mb-1">Surplus Amount</p>
                      <p className="text-2xl font-bold text-emerald-400">$467,865</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400 mb-1">Sale Date</p>
                      <p className="text-lg font-semibold text-white">Dec 19, 2024</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400 mb-1">Surplus Type</p>
                      <Badge className="bg-blue-500/15 text-blue-400 border-0">Sheriff Sale</Badge>
                    </CardContent>
                  </Card>
                </div>

                {/* Pipeline */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-base">Pipeline Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1 flex-wrap">
                      {PIPELINE_STAGES.map((stage, i) => (
                        <div
                          key={stage}
                          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                            i === 0
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-slate-700/50 text-slate-500"
                          }`}
                        >
                          {i === 0 && <CheckCircle2 className="w-3 h-3" />}
                          {stage}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Pre-Call Checklist */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-base">Pre-Call Checklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        { label: "Case verified", ok: true },
                        { label: "Surplus confirmed: $467,865", ok: true },
                        { label: "Owner identity: unknown", ok: false, warn: true },
                        { label: "County allows representation", ok: true },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {item.ok ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          )}
                          <span className={item.warn ? "text-amber-400" : "text-slate-300"}>{item.label}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Missing Data */}
                  <Card className="bg-red-500/10 border-red-500/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-red-400 text-base">Missing Data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {["No Email", "No Phone"].map(item => (
                        <div key={item} className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 text-sm">{item}</span>
                        </div>
                      ))}
                      <DisabledButton className="w-full mt-2">Run People Search</DisabledButton>
                    </CardContent>
                  </Card>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <DisabledButton className="bg-emerald-600">Send Portal Invite</DisabledButton>
                  <DisabledButton>Generate Agreement</DisabledButton>
                  <DisabledButton>Log Contact Attempt</DisabledButton>
                </div>
              </motion.div>
            )}

            {/* TAB 3: Compliance */}
            {activeTab === "compliance" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
                <h1 className="text-2xl font-bold text-white">State Compliance Engine</h1>
                <p className="text-slate-400 text-sm">Fee caps, registration requirements, and hassle ratings for every state.</p>
                <Card className="bg-slate-800 border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-700">
                          <th className="text-left px-4 py-3 text-slate-400 font-medium">State</th>
                          <th className="text-left px-4 py-3 text-slate-400 font-medium">Fee Cap</th>
                          <th className="text-left px-4 py-3 text-slate-400 font-medium">Registration</th>
                          <th className="text-left px-4 py-3 text-slate-400 font-medium">Hassle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {COMPLIANCE_DATA.map((row, i) => (
                          <tr key={row.state} className={`border-b border-slate-700/50 ${i % 2 === 0 ? "bg-slate-800/50" : ""}`}>
                            <td className="px-4 py-3 font-bold text-white">{row.state}</td>
                            <td className="px-4 py-3 text-slate-300">{row.feeCap}</td>
                            <td className="px-4 py-3">
                              <span className={row.registration === "None" ? "text-emerald-400" : "text-amber-400"}>
                                {row.registration}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <HassleStars rating={row.hassle} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <p className="text-xs text-slate-500 text-center">Full compliance data for all 50 states + DC available after sign-up.</p>
              </motion.div>
            )}

            {/* TAB 4: Portal Preview */}
            {activeTab === "portal" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
                <div>
                  <h1 className="text-2xl font-bold text-white">Client Portal Preview</h1>
                  <p className="text-slate-400 text-sm">This is what your clients see when they receive a portal link.</p>
                </div>

                {/* Mock portal */}
                <Card className="bg-slate-800 border-slate-700">
                  <div className="bg-emerald-600 p-5 rounded-t-xl">
                    <h2 className="text-white text-lg font-bold">Your Surplus Recovery Case</h2>
                    <p className="text-emerald-100 text-sm">Case #CV2024-032522 · Maricopa County, AZ</p>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-slate-400">Surplus Amount</p>
                        <p className="text-lg font-bold text-emerald-400">$467,865</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Your Fee (20%)</p>
                        <p className="text-lg font-bold text-amber-400">$93,573</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">You'll Receive</p>
                        <p className="text-lg font-bold text-white">$374,292</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-white font-medium">25%</span>
                      </div>
                      <Progress value={25} className="h-2 bg-slate-700" />
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                      <p className="text-blue-400 font-semibold text-sm mb-1">Next Step</p>
                      <p className="text-white text-sm">Review and sign your fee agreement.</p>
                      <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700 w-full">
                        Sign Agreement →
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {[
                        { label: "Sign Agreement", done: false, active: true },
                        { label: "Upload ID", done: false, active: false },
                        { label: "Notarization", done: false, active: false },
                        { label: "Done", done: false, active: false },
                      ].map((step, i) => (
                        <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${
                          step.active ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-slate-900/40"
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            step.done ? "bg-emerald-600 text-white" :
                            step.active ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/50" :
                            "bg-slate-700 text-slate-500"
                          }`}>{i + 1}</div>
                          <span className={step.active ? "text-white font-medium text-sm" : "text-slate-400 text-sm"}>{step.label}</span>
                          {step.active && <ChevronRight className="w-4 h-4 text-emerald-400 ml-auto" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-slate-800 bg-slate-900 p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Ready to start recovering surplus?</h2>
        <p className="text-slate-400 text-sm mb-4">
          This is sample data for demonstration purposes. Real leads are uploaded daily from counties across the US.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => window.location.href = createPageUrl("AgentApply") + "?plan=starter"}
          >
            Get Started — $50/mo <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500"
            onClick={() => window.location.href = createPageUrl("AgentApply") + "?plan=pro"}
          >
            Get Started Pro — $97/mo <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}