import Link from "next/link";
import { updateTaskAction } from "@/app/tasks/actions";
import { WeekChart } from "@/components/dashboard/week-chart";
import { FocusSearchButton } from "@/components/shared/search-shortcut";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { Button } from "@/components/ui/button";
import { requireClinician } from "@/lib/auth";
import { REVIEW_LABEL, greeting } from "@/lib/dashboard/summary";
import { loadDashboard } from "@/lib/data/dashboard";
import { ROLE_LABEL } from "@/lib/roster/logic";
import { dueBucket, formatDue } from "@/lib/tasks/logic";
import { TIME_ZONE, formatNzTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

const card = "rounded-[20px] border border-hippo-200 bg-white p-5";
const cardTitle = "text-sm font-semibold uppercase tracking-[0.08em] text-hippo-900";

function Tile({
  label,
  value,
  hint,
  href,
  alert,
}: {
  label: string;
  value: number;
  hint: string;
  href: string;
  alert?: string;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-[20px] border bg-white p-5 transition-colors hover:border-hippo-400 ${
        alert ? "border-red-300" : "border-hippo-200"
      }`}
    >
      <p className="text-sm text-charcoal">{label}</p>
      <p className={`mt-1 text-4xl font-semibold ${alert ? "text-red-700" : "text-hippo-900"}`}>{value}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-charcoal/80">
        {alert && (
          <span aria-hidden="true" className="grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            !
          </span>
        )}
        {alert ?? hint}
      </p>
    </Link>
  );
}

export default async function DashboardPage() {
  const { supabase, userId, email } = await requireClinician();
  const now = new Date();
  const data = await loadDashboard(supabase, userId, now);
  const { counts } = data;
  const firstName = data.name ?? email.split("@")[0];
  const dateLine = new Intl.DateTimeFormat("en-NZ", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(now);

  return (
    <main id="main" className="mx-auto max-w-6xl space-y-8 px-5 py-10 lg:px-[30px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-body-2 mb-3 text-hippo-900/80">SHIFT DASHBOARD</p>
          <h1 className="text-h2 text-hippo-900">
            {greeting(now)}, {firstName}
          </h1>
          <p className="mt-2 text-sm text-charcoal">{dateLine}</p>
        </div>
        <LiveRefresh tables={["tasks", "consultations", "roster_shifts"]} renderedAt={new Date().toISOString()} />
      </div>

      <nav aria-label="Quick actions" className="flex flex-wrap gap-3">
        <FocusSearchButton />
        <Button asChild variant="outline">
          <Link href="/patients/new">New patient</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/handover">Shift handover</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/tasks?view=open">All open tasks</Link>
        </Button>
      </nav>

      <section aria-label="At a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile
          label="My overdue tasks"
          value={counts.myOverdue}
          href="/tasks"
          hint={`${counts.teamOverdue} overdue across the team`}
          alert={counts.myOverdue ? `${counts.teamOverdue} overdue across the team` : undefined}
        />
        <Tile
          label="My tasks due today"
          value={counts.myDueToday}
          href="/tasks"
          hint={`${counts.myOpen} open in total · ${counts.doneToday} done today`}
        />
        <Tile
          label="Notes to review"
          value={counts.toReview}
          href="#review"
          hint={counts.myToReview ? `${counts.myToReview} of them yours` : "None of them yours"}
        />
        <Tile
          label="Patients seen today"
          value={counts.seenToday}
          href="/handover"
          hint={`${counts.unassigned} unassigned task${counts.unassigned === 1 ? "" : "s"}`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <section aria-labelledby="my-tasks" className={card}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="my-tasks" className={cardTitle}>
                My tasks
              </h2>
              <Link href="/tasks" className="text-sm text-hippo-600 hover:underline">
                {data.myTaskTotal > data.myTasks.length ? `See all ${data.myTaskTotal}` : "Open task manager"}
              </Link>
            </div>
            {data.myTasks.length === 0 ? (
              <p className="mt-3 text-sm text-charcoal">Nothing assigned to you. Nice work.</p>
            ) : (
              <ul className="mt-3 divide-y divide-hippo-100">
                {data.myTasks.map((task) => {
                  const bucket = dueBucket(task, now);
                  return (
                    <li key={task.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="break-words font-medium">{task.title}</p>
                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm">
                          <Link href={`/patients/${task.patientId}`} className="text-hippo-600 hover:underline">
                            {task.patientName}
                          </Link>
                          <span
                            className={
                              bucket === "overdue"
                                ? "font-medium text-red-700"
                                : bucket === "today"
                                  ? "font-medium text-amber-800"
                                  : "text-charcoal/80"
                            }
                          >
                            {bucket === "overdue" && "Overdue · "}
                            {task.dueAt ? `Due ${formatDue(task.dueAt, now)}` : "No due date"}
                          </span>
                        </p>
                      </div>
                      <form action={updateTaskAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <Button type="submit" size="sm" variant="outline" name="status" value="done">
                          Done
                        </Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section id="review" aria-labelledby="review-title" className={`${card} scroll-mt-6`}>
            <h2 id="review-title" className={cardTitle}>
              Notes waiting for review
            </h2>
            {data.review.length === 0 ? (
              <p className="mt-3 text-sm text-charcoal">Every note is finalised.</p>
            ) : (
              <ul className="mt-3 divide-y divide-hippo-100">
                {data.review.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {c.patientName}
                        {c.doctorId === userId && (
                          <span className="ml-2 rounded-full bg-hippo-100 px-2 py-0.5 text-xs font-normal text-hippo-900">
                            Yours
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-charcoal/80">
                        {REVIEW_LABEL[c.status]} · seen {formatDue(c.consultedAt, now).replace(/ \(.*\)$/, "")}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/consultations/${c.id}`}>Open note</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section aria-labelledby="on-shift" className={card}>
            <h2 id="on-shift" className={`${cardTitle} flex items-center gap-2`}>
              <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" /> On shift now
            </h2>
            {data.onShift.length === 0 ? (
              <p className="mt-3 text-sm text-charcoal">Nobody is rostered right now.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {data.onShift.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span>
                      <span className="font-medium">{s.staffName}</span>{" "}
                      <span className="text-charcoal/80">
                        {ROLE_LABEL[s.role]}, {s.area}
                      </span>
                    </span>
                    <span className="shrink-0 text-charcoal/80">until {formatNzTime(s.endsAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.laterToday.length > 0 && (
              <>
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/80">
                  Starting in the next 12 hours
                </h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {data.laterToday.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3">
                      <span>
                        <span className="font-medium">{s.staffName}</span>{" "}
                        <span className="text-charcoal/80">{ROLE_LABEL[s.role]}</span>
                      </span>
                      <span className="shrink-0 text-charcoal/80">from {formatNzTime(s.startsAt)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link href="/roster" className="mt-4 inline-block text-sm text-hippo-600 hover:underline">
              Full roster
            </Link>
          </section>

          <section aria-labelledby="seen-today" className={card}>
            <h2 id="seen-today" className={cardTitle}>
              Seen today
            </h2>
            {data.seenToday.length === 0 ? (
              <p className="mt-3 text-sm text-charcoal">No consultations yet today.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {data.seenToday.map((c) => (
                  <li key={c.id} className="flex justify-between gap-3">
                    <Link href={`/consultations/${c.id}`} className="font-medium text-hippo-900 hover:underline">
                      {c.patientName}
                    </Link>
                    <span className="shrink-0 text-charcoal/80">
                      {formatNzTime(c.consultedAt)} · {c.status === "finalised" ? "Finalised" : "Open"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Activity" className={card}>
            <WeekChart week={data.week} today={data.today} />
          </section>
        </div>
      </div>
    </main>
  );
}
