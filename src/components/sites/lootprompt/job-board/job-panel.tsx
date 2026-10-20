"use client";

import { ChevronDown } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { jobBoard, promptHref } from "../data";
import { openCrewGate } from "../shared/crew-gate";
import { DenizWorkshop } from "./deniz-workshop";
import "./job-board.css";

type OpenJob = (typeof jobBoard.top_open)[number];

interface WorksJob {
  title: string;
  votes: number;
}

interface DoneJob {
  title: string;
  poster: string | null;
  post_id: string | null;
}

function asWorksJob(value: unknown): WorksJob | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<WorksJob>;
  return typeof v.title === "string" ? { title: v.title, votes: Number(v.votes) || 0 } : null;
}

function asDoneJobs(value: unknown[]): DoneJob[] {
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const v = item as Partial<DoneJob>;
    if (typeof v.title !== "string") return [];
    return [{ title: v.title, poster: v.poster ?? null, post_id: v.post_id ?? null }];
  });
}

const EDITORIAL_BUTTON =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-ui text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-primary bg-primary text-primary-foreground shadow-none hover:border-accent hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2";

/** Guests see the board but every action routes through the crew gate. */
function gateJobBoard() {
  openCrewGate("job_board", null);
}

/** One dot per seat; filled seats are backers. */
function SeatMeter({ votes, goal }: { votes: number; goal: number }) {
  const near = goal - votes <= 5 && votes < goal;
  return (
    <div
      className={`seat-meter${near ? " is-near" : ""}`}
      aria-label={`${votes} of ${goal} seats backed`}
    >
      {Array.from({ length: Math.max(1, goal) }, (_, i) => (
        <span key={i} className={i < votes ? "is-filled" : ""} />
      ))}
    </div>
  );
}

function OpenJobCard({ job, goal, index }: { job: OpenJob; goal: number; index: number }) {
  const seatsLeft = Math.max(0, goal - job.votes);
  return (
    <article className="jp-open job-card" style={{ "--i": index } as CSSProperties}>
      <h4>{job.title}</h4>
      <div className="job-chips">
        <span>{job.model || "Any model"}</span>
      </div>
      <div>
        <SeatMeter votes={job.votes} goal={goal} />
      </div>
      <div className="jp-open-foot">
        <span className="job-seats-left">
          {seatsLeft === 0 ? "crew assembled" : `${seatsLeft} seats left`}
        </span>
        <button type="button" className="job-back-button" onClick={gateJobBoard}>
          <span className="job-count-roll">{job.votes}</span> Back it
        </button>
      </div>
    </article>
  );
}

/** "The Job Board" teaser: open/in-the-works/pulled-off counts with an expandable board. */
export function JobPanel() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const board = jobBoard;
  const goal = board.goal ?? 30;
  const topJob = board.top_open[0] ?? null;
  const inWorks = asWorksJob(board.in_works);
  const recentDone = asDoneJobs(board.recent_done);

  return (
    <section className="job-panel mx-auto w-full max-w-6xl px-5 sm:px-6" aria-label="The Job Board">
      <div className={`jp-paper${open ? " is-open" : ""}`}>
        <header className="jp-band">
          <h2>THE JOB BOARD</h2>
          <div className="jp-pills">
            <span>{board.open} open</span>
            <span>{board.works} in the works</span>
            <span>{board.done} pulled off</span>
          </div>
        </header>
        <div className="jp-summary">
          <div className="jp-deniz" aria-hidden="true">
            <DenizWorkshop
              mini
              viewBox="120 90 260 190"
              goal={goal}
              job={
                topJob
                  ? { title: topJob.title, votes: topJob.votes, status: "open", author: null }
                  : null
              }
            />
          </div>
          <div className="jp-summary-copy">
            {topJob ? (
              <>
                <strong>{topJob.title}</strong>
                <span className="jp-seats">
                  {topJob.votes}/{goal} seats
                </span>
              </>
            ) : (
              <strong className="jp-empty-title">Be the first to pitch a job</strong>
            )}
          </div>
          <button
            type="button"
            className="jp-toggle"
            aria-expanded={open}
            aria-controls="job-panel-details"
            onClick={() => {
              setMounted(true);
              setOpen((v) => !v);
            }}
          >
            <span className="jp-toggle-disc">
              <ChevronDown className="size-5" aria-hidden="true" />
            </span>
            <span className="jp-toggle-hand">{open ? "Close" : "Open the board"}</span>
          </button>
        </div>
        <div id="job-panel-details" className="jp-details" aria-hidden={!open}>
          <div className="jp-details-inner">
            {mounted ? (
              <>
                <div className="jp-col">
                  <h3>Open jobs</h3>
                  {board.top_open.length ? (
                    board.top_open.map((job, i) => (
                      <OpenJobCard key={job.id} job={job} goal={goal} index={i} />
                    ))
                  ) : (
                    <p className="job-empty">
                      No open jobs yet — the board is waiting for its first pitch.
                    </p>
                  )}
                </div>
                <div className="jp-col">
                  <h3>In the works</h3>
                  {inWorks ? (
                    <article className="jp-works job-card" style={{ "--i": 3 } as CSSProperties}>
                      <h4>{inWorks.title}</h4>
                      <p className="job-note">crew assembled, Deniz is on it</p>
                      <span className="job-seats-left">{inWorks.votes} backers</span>
                    </article>
                  ) : (
                    <p className="job-empty">Nothing on Deniz&apos;s desk right now.</p>
                  )}
                  <h3>Pulled off</h3>
                  {recentDone.length ? (
                    <div className="jp-done-grid">
                      {recentDone.map((job, i) => {
                        const body = (
                          <>
                            <span className="jp-done-poster">
                              {job.poster ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={job.poster} alt="" loading="lazy" />
                              ) : (
                                <i>film</i>
                              )}
                              <b>✓</b>
                            </span>
                            <small>{job.title}</small>
                          </>
                        );
                        const style = { "--i": 4 + i } as CSSProperties;
                        return job.post_id ? (
                          <a
                            key={`${job.title}-${i}`}
                            href={promptHref(job.post_id)}
                            className="jp-done"
                            style={style}
                          >
                            {body}
                          </a>
                        ) : (
                          <span key={`${job.title}-${i}`} className="jp-done">
                            {body}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="job-empty">No pulled-off jobs yet.</p>
                  )}
                </div>
                <div className="jp-cta">
                  <button type="button" className={EDITORIAL_BUTTON} onClick={gateJobBoard}>
                    Join the crew to pitch a job
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
