"use client";

import { useState } from "react";
import { TopBar } from "@/components/topbar/TopBar";
import { TasksView } from "@/components/tasks/TasksView";

type Props = React.ComponentProps<typeof TasksView>;

export function TasksPageShell(props: Props) {
  const [composing, setComposing] = useState(false);
  return (
    <>
      <TopBar
        title="My Tasks"
        subtitle="Personal queue and team assignments"
        primaryAction="+ New task"
        onPrimaryAction={() => setComposing(true)}
      />
      <div className="mt-6">
        <TasksView {...props} openCompose={composing} onComposeClose={() => setComposing(false)} />
      </div>
    </>
  );
}
