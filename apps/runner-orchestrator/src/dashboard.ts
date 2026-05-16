import { db } from "./db.js";
import { getQueueSnapshot } from "./queue.js";

export async function getDashboardState() {
  const snapshot = getQueueSnapshot();
  const recent = await db.submissionTestRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      status: true,
      trigger: true,
      attempt: true,
      score: true,
      maxScore: true,
      visiblePassed: true,
      visibleTotal: true,
      hiddenPassed: true,
      hiddenTotal: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      submissionId: true,
      assignmentId: true,
    },
  });
  return { queue: snapshot, recent };
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Tutly Runner Orchestrator</title>
<style>
  :root { color-scheme: dark; --bg:#0b0d10; --panel:#13171d; --border:#222a33; --muted:#7c8794; --text:#e6edf3; }
  * { box-sizing: border-box; }
  body { margin:0; font:13px/1.5 -apple-system,SF Pro Text,Segoe UI,Inter,sans-serif; background:var(--bg); color:var(--text); }
  header { display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:1px solid var(--border); }
  h1 { margin:0; font-size:14px; font-weight:600; letter-spacing:0.3px; }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#22c55e; margin-right:6px; vertical-align:middle; }
  .dot.bad { background:#ef4444; }
  main { padding:16px 20px; display:grid; gap:16px; grid-template-columns: 1fr 1fr 1fr 2fr; }
  .card { background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:14px; }
  .card h2 { margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); font-weight:600; }
  .big { font-size:28px; font-weight:600; }
  .small { color:var(--muted); }
  section { padding: 0 20px 32px; }
  section h2 { font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); margin: 8px 0; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:7px 10px; border-bottom:1px solid var(--border); font-variant-numeric: tabular-nums; }
  th { font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted); font-weight:500; }
  td.id { font-family: ui-monospace,SF Mono,monospace; font-size:11px; color:var(--muted); }
  .badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:500; }
  .badge.queued { background:#1e293b; color:#94a3b8; }
  .badge.running { background:#1e3a5f; color:#7dd3fc; }
  .badge.passed { background:#14532d; color:#86efac; }
  .badge.failed { background:#7c2d12; color:#fca5a5; }
  .badge.error { background:#7f1d1d; color:#fca5a5; }
  .badge.cancelled { background:#374151; color:#9ca3af; }
  .err { color:#fca5a5; font-size:11px; }
  .ago { color:var(--muted); font-size:11px; }
  footer { color:var(--muted); padding:12px 20px; border-top:1px solid var(--border); font-size:11px; }
</style>
</head>
<body>
<header>
  <h1>tutly runner-orchestrator</h1>
  <div id="status"><span class="dot"></span>connected · auto-refresh 2s</div>
</header>
<main>
  <div class="card"><h2>Queue depth</h2><div class="big" id="depth">—</div><div class="small">pending jobs</div></div>
  <div class="card"><h2>Active</h2><div class="big" id="active">—</div><div class="small">running now</div></div>
  <div class="card"><h2>Recent passed</h2><div class="big" id="passed">—</div><div class="small">of last 30</div></div>
  <div class="card"><h2>Recent failed/error</h2><div class="big" id="failed">—</div><div class="small">of last 30</div></div>
</main>
<section>
  <h2>In flight</h2>
  <table id="inflight"><thead><tr><th>Test run id</th><th>Status</th><th>Submission</th><th>Started</th></tr></thead><tbody></tbody></table>
</section>
<section>
  <h2>Last 30 runs</h2>
  <table id="recent"><thead><tr>
    <th>Test run id</th><th>Status</th><th>Score</th><th>Visible</th><th>Hidden</th><th>Trigger</th><th>Attempt</th><th>Duration</th><th>Created</th><th>Error</th>
  </tr></thead><tbody></tbody></table>
</section>
<footer>Polls /dashboard/data every 2 s. Refresh page to reset.</footer>

<script>
function ago(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return Math.round(ms/1000) + "s";
  if (ms < 3600000) return Math.round(ms/60000) + "m";
  if (ms < 86400000) return Math.round(ms/3600000) + "h";
  return Math.round(ms/86400000) + "d";
}
function dur(startISO, endISO) {
  if (!startISO || !endISO) return "—";
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  if (ms < 1000) return ms + "ms";
  return (ms/1000).toFixed(1) + "s";
}
function badge(s) {
  return '<span class="badge ' + s.toLowerCase() + '">' + s + '</span>';
}
function shortId(id) {
  return id ? id.slice(0,8) : "—";
}
async function tick() {
  try {
    const res = await fetch("/dashboard/data");
    if (!res.ok) throw new Error("status " + res.status);
    const data = await res.json();
    document.getElementById("status").innerHTML = '<span class="dot"></span>connected · auto-refresh 2s';

    document.getElementById("depth").textContent = data.queue.queueDepth;
    document.getElementById("active").textContent = data.queue.active;
    const passed = data.recent.filter(r => r.status === "PASSED").length;
    const failed = data.recent.filter(r => r.status === "FAILED" || r.status === "ERROR").length;
    document.getElementById("passed").textContent = passed;
    document.getElementById("failed").textContent = failed;

    const activeRows = data.recent
      .filter(r => r.status === "RUNNING" || r.status === "QUEUED" || data.queue.activeIds.includes(r.id))
      .map(r => '<tr>' +
        '<td class="id" title="' + r.id + '">' + shortId(r.id) + '</td>' +
        '<td>' + badge(r.status) + '</td>' +
        '<td class="id" title="' + r.submissionId + '">' + shortId(r.submissionId) + '</td>' +
        '<td class="ago">' + ago(r.startedAt || r.createdAt) + ' ago</td>' +
        '</tr>').join("");
    document.querySelector("#inflight tbody").innerHTML = activeRows || '<tr><td colspan="4" class="ago" style="text-align:center; padding:18px;">No runs in flight</td></tr>';

    const recentRows = data.recent.map(r => '<tr>' +
      '<td class="id" title="' + r.id + '">' + shortId(r.id) + '</td>' +
      '<td>' + badge(r.status) + '</td>' +
      '<td>' + r.score + '/' + r.maxScore + '</td>' +
      '<td>' + r.visiblePassed + '/' + r.visibleTotal + '</td>' +
      '<td>' + r.hiddenPassed + '/' + r.hiddenTotal + '</td>' +
      '<td class="ago">' + r.trigger + '</td>' +
      '<td class="ago">#' + r.attempt + '</td>' +
      '<td class="ago">' + dur(r.startedAt, r.completedAt) + '</td>' +
      '<td class="ago">' + ago(r.createdAt) + ' ago</td>' +
      '<td class="err">' + (r.errorMessage || "") + '</td>' +
      '</tr>').join("");
    document.querySelector("#recent tbody").innerHTML = recentRows || '<tr><td colspan="10" class="ago" style="text-align:center; padding:18px;">No runs yet</td></tr>';
  } catch (e) {
    document.getElementById("status").innerHTML = '<span class="dot bad"></span>disconnected: ' + e.message;
  }
}
tick();
setInterval(tick, 2000);
</script>
</body>
</html>`;

export function dashboardHtml(): string {
  return HTML;
}
