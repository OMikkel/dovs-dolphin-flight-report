const form = document.getElementById("history-filters");
const phaseFilter = document.getElementById("phase-filter");
const resultFilter = document.getElementById("result-filter");
const search = document.getElementById("flight-search");
const runs = document.getElementById("history-runs");
const status = document.getElementById("history-status");
const empty = document.getElementById("history-empty");
const params = new URLSearchParams(window.location.search);
const phaseButtons = [...document.querySelectorAll("[data-phase]")];
const allPhases = document.getElementById("all-phases");
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function phaseLabel(phase) {
  return phase === "build" ? "Build failure" : phase === "*" ? "All phases" : `Phase ${phase}`;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function flightCard(report, index, total, latest) {
  const card = element("a", `history-run ${report.failed ? "failed" : "passed"}`);
  card.href = report.path;
  const number = element("div", "run-identity");
  number.append(element("span", "run-number", `FLIGHT ${String(total - index).padStart(3, "0")}`));
  number.append(element("span", "run-result", report.failed ? "FAIL" : "PASS"));
  const details = element("div", "run-details");
  const heading = element("div", "run-heading");
  heading.append(element("strong", "run-phase", phaseLabel(report.phase)));
  if (report.id === latest) heading.append(element("span", "run-latest", "LATEST"));
  const timestamp = element("time", "run-date", `${dateFormat.format(new Date(report.generated_at))} UTC`);
  timestamp.dateTime = report.generated_at;
  const context = element("div", "run-meta");
  const commit = report.commit === "Not available" ? report.commit : report.commit.slice(0, 12);
  const commitLabel = element("span", "run-commit", commit);
  commitLabel.title = report.commit;
  context.append(element("span", "run-branch", report.branch), commitLabel);
  details.append(heading, timestamp, context);
  const outcome = element("div", "run-outcome");
  outcome.append(element("strong", "", report.failed ? `${report.failed} / ${report.total} failed` : `${report.passed} / ${report.total} passed`));
  outcome.append(element("span", "run-duration", `${report.duration_seconds.toFixed(2)}s`));
  outcome.append(element("span", "run-open", "Open report ↗"));
  card.append(number, details, outcome);
  return card;
}

async function launchHistory() {
  const response = await fetch("index.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const manifest = await response.json();
  const reports = manifest.reports;
  const currentPhase = reports.find((report) => /^[1-5]$/.test(report.phase))?.phase || "1";
  const phases = [...new Set(reports.map((report) => report.phase))].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  document.getElementById("globe-signal-count").textContent = `ALL PHASES / ${reports.length} ARCHIVED SIGNALS`;
  document.getElementById("archive-total").textContent = reports.length;
  document.getElementById("archive-passed").textContent = reports.filter((report) => !report.failed).length;
  document.getElementById("archive-failed").textContent = reports.filter((report) => report.failed).length;
  document.getElementById("archive-phases").textContent = phases.filter((phase) => /^[1-5]$/.test(phase)).length;
  for (const phase of [...new Set(["1", "2", "3", "4", "5", ...phases])]) {
    const option = element("option", "", `${phaseLabel(phase)} (${reports.filter((report) => report.phase === phase).length})`);
    option.value = phase;
    phaseFilter.append(option);
  }
  phaseFilter.value = params.get("phase") || "";
  resultFilter.value = params.get("status") || "";
  search.value = params.get("q") || "";

  function render() {
    const query = search.value.trim().toLowerCase();
    const visible = reports.map((report, index) => ({ report, index })).filter(({ report }) =>
      (!phaseFilter.value || report.phase === phaseFilter.value) &&
      (!resultFilter.value || (report.failed ? "failed" : "passed") === resultFilter.value) &&
      (!query || `${report.branch} ${report.commit}`.toLowerCase().includes(query))
    );
    runs.replaceChildren(...visible.map(({ report, index }) => flightCard(report, index, reports.length, manifest.latest_id)));
    status.textContent = `${visible.length} of ${reports.length} flights · newest first`;
    empty.hidden = visible.length !== 0;
    const focusedPhase = phaseFilter.value || currentPhase;
    const numbered = /^[1-5]$/.test(focusedPhase);
    document.getElementById("phase-heading-label").textContent = numbered ? "PHASE" : "MISSION";
    document.getElementById("phase-heading-number").textContent = numbered ? focusedPhase.padStart(2, "0") : focusedPhase === "build" ? "BUILD" : "ALL";
    document.getElementById("phase-heading-total").hidden = !numbered;
    document.querySelector(".history-phase-panel").classList.toggle("alternate", !numbered);
    document.getElementById("flight-count").textContent = `${visible.length} FLIGHTS / ${phaseFilter.value ? phaseLabel(phaseFilter.value).toUpperCase() : "ALL PHASES"}`;
    allPhases.setAttribute("aria-pressed", String(!phaseFilter.value));
    for (const button of phaseButtons) {
      const count = reports.filter((report) => report.phase === button.dataset.phase).length;
      button.querySelector("span").textContent = `${count} FLIGHT${count === 1 ? "" : "S"}`;
      button.setAttribute("aria-pressed", String(button.dataset.phase === phaseFilter.value));
      button.classList.toggle("current", button.dataset.phase === focusedPhase);
      button.classList.toggle("upcoming", Number(button.dataset.phase) > Number(currentPhase) && button.dataset.phase !== focusedPhase);
    }
    const url = new URL(window.location.href);
    for (const [key, value] of [["phase", phaseFilter.value], ["status", resultFilter.value], ["q", search.value.trim()]]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
  }

  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", render);
  for (const button of phaseButtons) {
    button.addEventListener("click", () => {
      phaseFilter.value = button.dataset.phase;
      render();
    });
  }
  allPhases.addEventListener("click", () => {
    phaseFilter.value = "";
    render();
  });
  form.addEventListener("reset", () => {
    phaseFilter.value = "";
    resultFilter.value = "";
    search.value = "";
    render();
  });
  render();
  launchArchiveGlobe(reports);
}

async function launchArchiveGlobe(reports) {
  const root = document.getElementById("globe");
  try {
    const { mountGlobe } = await import("./globe.js");
    const telemetry = reports.map((report, index) => ({
      failed: Boolean(report.failed),
      href: report.path,
      description: `${report.failed ? "✕" : "✓"} Flight ${String(reports.length - index).padStart(3, "0")} · ${phaseLabel(report.phase)} · ${report.passed}/${report.total} passed · ${dateFormat.format(new Date(report.generated_at))} UTC`,
    }));
    await mountGlobe(root, telemetry, document.getElementById("globe-tooltip"), {
      failed: false,
      onSelect: (report) => { window.location.href = report.href; },
    });
  } catch {
    root.classList.add("offline");
  }
}

launchHistory().catch(() => {
  status.textContent = "The flight log could not be loaded. Refresh to try again, or open the latest flight above.";
});
