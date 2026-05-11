"use client";

import { useState } from "react";
import { TopBar } from "@/components/topbar/TopBar";
import { ActionItemsBoard } from "@/components/actions/ActionItemsBoard";

type Props = React.ComponentProps<typeof ActionItemsBoard>;

export function ActionsPageShell(props: Props) {
  const [composing, setComposing] = useState(false);
  return (
    <>
      <TopBar
        title="Action Items"
        subtitle="Every action item across all meetings"
      />
      <div className="mt-6">
        <ActionItemsBoard {...props} openCompose={composing} onComposeClose={() => setComposing(false)} />
      </div>
    </>
  );
}
