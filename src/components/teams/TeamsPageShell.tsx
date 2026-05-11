"use client";

import { useState } from "react";
import { TopBar } from "@/components/topbar/TopBar";
import { TeamsView } from "./TeamsView";

interface TeamsPageShellProps {
  initialTeams: any[];
  allUsers: any[];
  currentUserId: string;
}

export function TeamsPageShell({ initialTeams, allUsers, currentUserId }: TeamsPageShellProps) {
  const [composing, setComposing] = useState(false);
  return (
    <>
      <TopBar
        title="Teams"
        subtitle="Organize your workspace into focused groups"
      />
      <div className="mt-6">
        <TeamsView
          initialTeams={initialTeams}
          allUsers={allUsers}
          currentUserId={currentUserId}
          openCompose={composing}
          onComposeClose={() => setComposing(false)}
        />
      </div>
    </>
  );
}
