import { useState } from "react";
import {
  useSchedulerStore,
  generateTaskId,
  type Schedule,
} from "../store/schedulerStore";
import { formatSchedule, formatNextRun } from "../lib/scheduler";

export function SchedulerPanel() {
  const tasks = useSchedulerStore((s) =>
    s.order.map((id) => s.tasks[id]).filter(Boolean),
  );
  const toggleTask = useSchedulerStore((s) => s.toggleTask);
  const removeTask = useSchedulerStore((s) => s.removeTask);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 className="text-sm font-semibold">Scheduled Tasks</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/80"
        >
          {showNew ? "Cancel" : "+ New Task"}
        </button>
      </div>

      {showNew && <NewTaskForm onDone={() => setShowNew(false)} />}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-8">
            No scheduled tasks. Create one to automate agent workflows.
          </p>
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            className={`rounded-lg border p-3 ${
              task.enabled ? "" : "opacity-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${
                      task.enabled ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute w-3 h-3 bg-background rounded-full top-0.5 transition-transform ${
                        task.enabled ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                  <h3 className="text-sm font-medium truncate">{task.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground ml-10">
                  {formatSchedule(task.schedule)}
                  {" \u00B7 "}
                  Next: {formatNextRun(task.nextRun ? new Date(task.nextRun) : null)}
                </p>
                {task.lastRun && (
                  <p className="text-xs text-muted-foreground ml-10">
                    Last run: {new Date(task.lastRun).toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeTask(task.id)}
                className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded shrink-0"
              >
                Delete
              </button>
            </div>

            {task.runHistory.length > 0 && (
              <div className="mt-2 ml-10">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Recent runs:
                </p>
                {task.runHistory.slice(0, 3).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        run.status === "done"
                          ? "bg-primary"
                          : run.status === "error"
                            ? "bg-destructive"
                            : "bg-muted"
                      }`}
                    />
                    <span>
                      {new Date(run.startedAt).toLocaleString()} —{" "}
                      {run.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewTaskForm({ onDone }: { onDone: () => void }) {
  const addTask = useSchedulerStore((s) => s.addTask);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scheduleType, setScheduleType] = useState<Schedule["type"]>("interval");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [cronExpression, setCronExpression] = useState("0 */6 * * *");

  const handleSubmit = () => {
    if (!name.trim()) return;

    const schedule: Schedule =
      scheduleType === "cron"
        ? { type: "cron", expression: cronExpression }
        : scheduleType === "event"
          ? { type: "event", trigger: "manual" }
          : { type: "interval", minutes: intervalMinutes };

    addTask({
      id: generateTaskId(),
      name: name.trim(),
      instructions,
      schedule,
      modelId: "gpt-5.4-mini",
      personaId: null,
      enabled: true,
      lastRun: null,
      nextRun: Date.now() + 60000,
      runHistory: [],
    });

    setName("");
    setInstructions("");
    onDone();
  };

  return (
    <div className="p-4 border-b space-y-3 shrink-0">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Task name (e.g., 'Nightly E2E tests')"
        className="w-full px-3 py-1.5 text-sm border rounded-md"
      />

      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Agent instructions..."
        rows={3}
        className="w-full px-3 py-1.5 text-sm border rounded-md resize-none"
      />

      <div className="flex gap-2">
        <select
          value={scheduleType}
          onChange={(e) => setScheduleType(e.target.value as Schedule["type"])}
          className="px-3 py-1.5 text-sm border rounded-md"
        >
          <option value="interval">Every N minutes</option>
          <option value="cron">Cron expression</option>
          <option value="event">On event</option>
        </select>

        {scheduleType === "interval" && (
          <input
            type="number"
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            min={1}
            className="w-24 px-3 py-1.5 text-sm border rounded-md"
          />
        )}

        {scheduleType === "cron" && (
          <input
            type="text"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            placeholder="0 */6 * * *"
            className="flex-1 px-3 py-1.5 text-sm border rounded-md"
          />
        )}
      </div>

      <button
        onClick={handleSubmit}
        className="px-4 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/80"
      >
        Create Task
      </button>
    </div>
  );
}
