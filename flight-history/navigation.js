const navigation = document.getElementById("flight-navigation");

async function connectFlights() {
  const base = new URL(navigation.dataset.historyRoot, document.baseURI);
  const response = await fetch(new URL("index.json", base), { cache: "no-store" });
  if (!response.ok) return;
  const manifest = await response.json();
  const index = manifest.reports.findIndex((report) => report.id === navigation.dataset.runId);
  if (index < 0) return;
  for (const [direction, offset] of [["older", 1], ["newer", -1]]) {
    const report = manifest.reports[index + offset];
    const link = navigation.querySelector(`[data-flight-direction="${direction}"]`);
    if (!report) continue;
    link.href = new URL(report.path, base).href;
    link.title = `${report.phase === "build" ? "Build failure" : report.phase === "*" ? "All phases" : `Phase ${report.phase}`} · ${new Date(report.generated_at).toLocaleString()}`;
    link.hidden = false;
  }
}

if (navigation) connectFlights().catch(() => {});
