const STORE_KEY = "jp_complex_jobs";
const COUNT_KEY = "jp_complex_count";

async function getJobs() {
  const data = await browser.storage.local.get(STORE_KEY);
  return Array.isArray(data[STORE_KEY]) ? data[STORE_KEY] : [];
}

async function setJobs(jobs) {
  await browser.storage.local.set({ [STORE_KEY]: jobs, [COUNT_KEY]: jobs.length });
  await updateBadge(jobs.length);
}

async function updateBadge(count) {
  const text = count > 0 ? String(count) : "";
  await browser.browserAction.setBadgeText({ text });
  await browser.browserAction.setBadgeBackgroundColor({ color: "#6c5ce7" });
}

browser.runtime.onInstalled.addListener(async () => {
  await updateBadge(0);
});

browser.runtime.onMessage.addListener((message) => {
  if (!message || !message.type) return;

  if (message.type === "ADD_JOBS") {
    return (async () => {
      const incoming = Array.isArray(message.jobs) ? message.jobs : [];
      if (!incoming.length) return { count: (await getJobs()).length };

      const current = await getJobs();
      const seen = new Set(current.map((j) => j.key));
      let changed = false;

      for (const job of incoming) {
        if (!job || !job.key) continue;
        if (seen.has(job.key)) continue;
        seen.add(job.key);
        current.push(job);
        changed = true;
      }

      if (changed) {
        await setJobs(current);
      } else {
        await updateBadge(current.length);
      }

      return { count: current.length };
    })();
  }

  if (message.type === "GET_JOBS") {
    return (async () => {
      const jobs = await getJobs();
      return { jobs, count: jobs.length };
    })();
  }

  if (message.type === "CLEAR_JOBS") {
    return (async () => {
      await setJobs([]);
      return { count: 0 };
    })();
  }

  if (message.type === "SAVE_HTML") {
    return (async () => {
      try {
        const html = String(message.html || "");
        if (!html) return { ok: false, error: "Empty HTML" };
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const id = await browser.downloads.download({
          url,
          filename: "jp_complex_probability.html",
          saveAs: true
        });
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return { ok: true, id };
      } catch (err) {
        return { ok: false, error: err?.message || String(err) };
      }
    })();
  }

  if (message.type === "SAVE_JSON") {
    return (async () => {
      try {
        const data = message.data || [];
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const id = await browser.downloads.download({
          url,
          filename: "jp_complex_probability.json",
          saveAs: true
        });
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return { ok: true, id };
      } catch (err) {
        return { ok: false, error: err?.message || String(err) };
      }
    })();
  }
});
