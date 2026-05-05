"use client";

import { useState } from "react";
import { TopBar } from "@/components/topbar/TopBar";
import { ToolsGrid } from "@/components/tools/ToolsGrid";

type Props = React.ComponentProps<typeof ToolsGrid>;

export function ToolsPageShell(props: Props) {
  const [composing, setComposing] = useState(false);
  return (
    <>
      <TopBar
        title="Tools & Logins"
        subtitle="All software, credentials, and access"
        primaryAction="+ Add tool"
        onPrimaryAction={() => setComposing(true)}
      />
      <div className="mt-6">
        <ToolsGrid {...props} openCompose={composing} onComposeClose={() => setComposing(false)} />
      </div>
    </>
  );
}
