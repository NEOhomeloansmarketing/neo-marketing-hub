"use client";

import { useState } from "react";
import { RequestsAnalytics } from "./RequestsAnalytics";
import { ComplianceAnalytics } from "./ComplianceAnalytics";
import { SearchConsoleAnalytics } from "./SearchConsoleAnalytics";

type RequestStats = React.ComponentProps<typeof RequestsAnalytics>["stats"];
type ComplianceStats = React.ComponentProps<typeof ComplianceAnalytics>["stats"];

const TABS = [
  { id: "requests", label: "Marketing Requests" },
  { id: "compliance", label: "Advisor Compliance" },
  { id: "search", label: "Search Console" },
];

export function AnalyticsTabs({
  requestStats,
  complianceStats,
}: {
  requestStats: RequestStats;
  complianceStats: ComplianceStats;
}) {
  const [activeTab, setActiveTab] = useState("requests");

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

      {activeTab === "requests" && <RequestsAnalytics stats={requestStats} />}
      {activeTab === "compliance" && <ComplianceAnalytics stats={complianceStats} />}
      {activeTab === "search" && <SearchConsoleAnalytics />}
    </div>
  );
}
