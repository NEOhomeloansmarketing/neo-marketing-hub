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
      <TopBar
        title="Advisor Compliance"
        subtitle="Audit tracker for every advisor's public web & social presence"
      />
      <div className="mt-6">
        <AdvisorTable advisors={advisors} leaders={leaders} openCompose={composing} onComposeClose={() => setComposing(false)} />
      </div>
    </>
  );
}
