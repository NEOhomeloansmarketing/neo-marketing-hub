"use client";

import { useState } from "react";
import { RequestsAnalytics } from "./RequestsAnalytics";
import { ComplianceAnalytics } from "./ComplianceAnalytics";
import { SearchConsoleAnalytics } from "./SearchConsoleAnalytics";
import { DudaAnalytics } from "./DudaAnalytics";
import { TasksAnalytics } from "./TasksAnalytics";
import type { TasksAnalyticsStats, WeeklySummaryData } from "./TasksAnalytics";

type RequestStats = React.ComponentProps<typeof RequestsAnalytics>["stats"];
type ComplianceStats = React.ComponentProps<typeof ComplianceAnalytics>["stats"];

const TABS = [
  { id: "tasks", label: "📋 Team Tasks" },
  { id: "requests", label: "Marketing Requests" },
  { id: "compliance", label: "Advisor Compliance" },
  { id: "search", label: "Search Console" },
  { id: "matrix", label: "Matrix Sites" },
];

export function AnalyticsTabs({
  requestStats,
  complianceStats,
  taskStats,
  initialSummary,
}: {
  requestStats: RequestStats;
  complianceStats: ComplianceStats;
  taskStats: TasksAnalyticsStats;
  initialSummary: WeeklySummaryData | null;
}) {
  const [activeTab, setActiveTab] = useState("tasks");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: "#0a2540", border: "1px solid #1d4368", width: "fit-content" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="rounded-lg px-5 py-2 text-[12.5px] font-semibold transition"
            style={{
              background: activeTab === tab.id ? "#14375a" : "transparent",
              color: activeTab === tab.id ? "#5bcbf5" : "#858889",
              border: activeTab === tab.id ? "1px solid #1d4368" : "1px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "tasks" && <TasksAnalytics stats={taskStats} initialSummary={initialSummary} />}
      {activeTab === "requests" && <RequestsAnalytics stats={requestStats} />}
      {activeTab === "compliance" && <ComplianceAnalytics stats={complianceStats} />}
      {activeTab === "search" && <SearchConsoleAnalytics />}
      {activeTab === "matrix" && <DudaAnalytics />}
    </div>
  );
}
