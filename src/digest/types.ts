// Plan morning-digest § 1. The shared contract: every part of § 2 builds against this file.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string; // ISO 8601 with the log's offset, kept as written
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  owner: string | null; // owner of the job's last line; null renders as "—"
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that had one
  firstAt: string;
  lastAt: string;
};

export type StatusCounts = Record<RunStatus, number>;

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  counts: StatusCounts; // lines per status, for the board
  badLines: number; // lines that did not parse; counted, never thrown
};

// Returns null when runs/<night>.jsonl does not exist (the routes answer 404).
// An empty file gives a Night with no rows ("nothing ran").
export type ReadNight = (runsDir: string, night: string) => Night | null;
