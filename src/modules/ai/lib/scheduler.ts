import type { ScheduledTask, Schedule } from "../store/schedulerStore";

export function parseCronExpression(expr: string): Date | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const now = new Date();
  const [min, hour] = parts;

  if (min === "*" || hour === "*") return null;

  const next = new Date(now);
  next.setSeconds(0);
  next.setMilliseconds(0);

  const targetMin = parseInt(min, 10);
  const targetHour = parseInt(hour, 10);

  if (isNaN(targetMin) || isNaN(targetHour)) return null;

  next.setMinutes(targetMin);
  next.setHours(targetHour);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

export function calculateNextRun(schedule: Schedule): Date | null {
  switch (schedule.type) {
    case "cron":
      return parseCronExpression(schedule.expression);

    case "interval": {
      const next = new Date(Date.now() + schedule.minutes * 60 * 1000);
      return next;
    }

    case "event":
      return null;

    default:
      return null;
  }
}

export function shouldRunNow(task: ScheduledTask): boolean {
  if (!task.enabled) return false;
  if (!task.nextRun) return false;

  return Date.now() >= task.nextRun;
}

export function formatSchedule(schedule: Schedule): string {
  switch (schedule.type) {
    case "cron":
      return `Cron: ${schedule.expression}`;
    case "interval":
      if (schedule.minutes < 60) return `Every ${schedule.minutes}m`;
      if (schedule.minutes < 1440)
        return `Every ${Math.round(schedule.minutes / 60)}h`;
      return `Every ${Math.round(schedule.minutes / 1440)}d`;
    case "event":
      return `On: ${schedule.trigger}`;
    default:
      return "Unknown";
  }
}

export function formatNextRun(nextRun: Date | null): string {
  if (!nextRun) return "Not scheduled";
  const diff = nextRun.getTime() - Date.now();
  if (diff < 0) return "Overdue";

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `In ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `In ${hours}h`;
  const days = Math.floor(hours / 24);
  return `In ${days}d`;
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(
  onTaskDue: (task: ScheduledTask) => void,
  pollIntervalMs = 30000,
) {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(() => {
    const { tasks } = require("../store/schedulerStore").useSchedulerStore.getState();
    const now = Date.now();
    for (const task of Object.values(tasks) as ScheduledTask[]) {
      if (!task.enabled) continue;
      if (!task.nextRun) continue;

      if (now >= task.nextRun) {
        onTaskDue(task);

        const { updateTask } = require("../store/schedulerStore").useSchedulerStore.getState();
        const schedule = task.schedule;
        const nextNext = calculateNextRun(schedule);
        updateTask(task.id, { nextRun: nextNext?.getTime() ?? null });
      }
    }
  }, pollIntervalMs);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
