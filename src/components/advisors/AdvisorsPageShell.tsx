"use client";

import { useState } from "react";
import { TopBar } from "@/components/topbar/TopBar";
import { AdvisorTable } from "./AdvisorTable";

interface AdvisorsPageShellProps {
  advisors: any[];
  leaders: string[];
}

export function AdvisorsPageShell({ advisors, leaders }: AdvisorsPageShellProps) {
  const [composing, setComposing] = useState(false);
  return (
    <>
      <div className="flex items-center gap-3 pr-6">
        <div className="flex-1">
          <TopBar
            title="Advisor Compliance"
            subtitle="Audit tracker for every advisor's public web & social presence"
          />
        </div>
        <button
          onClick={() => setComposing(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition hover:brightness-110"
          style={{
            background: "linear-gradient(180deg, #5bcbf5, #3aa6cc)",
            color: "#061320",
            boxShadow: "0 4px 18px rgba(91,203,245,0.30)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Advisor
        </button>
      </div>
      <div className="mt-6">
        <AdvisorTable advisors={advisors} leaders={leaders} openCompose={composing} onComposeClose={() => setComposing(false)} />
      </div>
    </>
  );
}
