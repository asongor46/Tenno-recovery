import React from "react";
import { Badge } from "@/components/ui/badge";

export default function LeadFeedSidebar({ leads, selectedState, onSelectState, agentStates }) {
  // Build state counts
  const stateCounts = leads.reduce((acc, lead) => {
    acc[lead.state] = (acc[lead.state] || 0) + 1;
    return acc;
  }, {});

  const allStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
  const myStates = agentStates || [];
  const myStateEntries = allStates.filter(([s]) => myStates.includes(s));
  const otherStateEntries = allStates.filter(([s]) => !myStates.includes(s));

  const totalLeads = leads.length;

  return (
    <div className="w-44 flex-shrink-0 bg-slate-800/50 border-r border-slate-700 overflow-y-auto">
      <div className="p-3 border-b border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">States</p>
      </div>

      {/* All */}
      <button
        onClick={() => onSelectState("ALL")}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
          selectedState === "ALL"
            ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400"
            : "text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent"
        }`}
      >
        <span>All States</span>
        <Badge className="bg-slate-700 text-slate-300 border-0 text-xs">{totalLeads}</Badge>
      </button>

      {/* My States */}
      {myStateEntries.length > 0 && (
        <>
          <div className="px-3 py-1.5 mt-1">
            <p className="text-xs text-emerald-500/70 font-medium">My States</p>
          </div>
          {myStateEntries.map(([state, count]) => (
            <StateRow key={state} state={state} count={count} selected={selectedState === state} onClick={() => onSelectState(state)} />
          ))}
          {otherStateEntries.length > 0 && (
            <div className="px-3 py-1.5 mt-1 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 font-medium">Other States</p>
            </div>
          )}
        </>
      )}

      {/* Other States */}
      {otherStateEntries.map(([state, count]) => (
        <StateRow key={state} state={state} count={count} selected={selectedState === state} onClick={() => onSelectState(state)} />
      ))}

      {allStates.length === 0 && (
        <p className="px-3 py-4 text-xs text-slate-500">No leads yet</p>
      )}
    </div>
  );
}

function StateRow({ state, count, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
        selected
          ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400"
          : "text-slate-300 hover:bg-slate-700/50 border-l-2 border-transparent"
      }`}
    >
      <span>{state}</span>
      <Badge className="bg-slate-700 text-slate-300 border-0 text-xs">{count}</Badge>
    </button>
  );
}