/* Tab 1 — Parse Indeed search listings */

(function () {
    function textOrEmpty(el) {
        if (!el) return "";
        return normalizeText(el.textContent);
    }

    function normalizeText(text) {
        return String(text || "")
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function uniqueAttributes(values) {
        const out = [];
        const seen = new Set();
        for (const raw of values) {
            const cleaned = cleanAttribute(raw);
            if (!cleaned) continue;
            if (seen.has(cleaned)) continue;
            seen.add(cleaned);
            out.push(cleaned);
        }
        return out;
    }

    function cleanAttribute(value) {
        const text = normalizeText(value);
        if (!text) return "";
        const cleaned = text.replace(/\s*\+?\d+\s*$/g, "").replace(/\s*\+?\d+\s*/g, " ").trim();
        if (!cleaned || cleaned === "+1") return "";
        return cleaned;
    }

    function buildJobLink(link, jobId) {
        const origin = window.location.origin;
        if (jobId) return `${origin}/viewjob?jk=${encodeURIComponent(jobId)}`;
        if (!link) return "";
        return link.startsWith("http") ? link : new URL(link, origin).toString();
    }

    function collectJobs() {
        const rows = Array.from(document.querySelectorAll("td.resultContent, div.resultContent"));
        const cards = rows.length ? rows : Array.from(document.querySelectorAll(".job_seen_beacon, .result"));

        const jobs = [];
        const seen = new Set();

        for (const card of cards) {
            const titleLink = card.querySelector("a.jcs-JobTitle") || card.querySelector("h2 a") || card.querySelector("a[data-jk]");
            const title = textOrEmpty(titleLink?.querySelector("span") || titleLink);
            if (!title) continue;

            const company = textOrEmpty(card.querySelector("[data-testid='company-name']") || card.querySelector(".companyName"));
            const location = textOrEmpty(card.querySelector("[data-testid='text-location']") || card.querySelector(".companyLocation"));

            const attrEls = card.querySelectorAll("[data-testid='attribute_snippet_testid'] span, .metadataContainer span");
            const attributes = uniqueAttributes(Array.from(attrEls).map((el) => el.textContent));

            const jobId = titleLink?.getAttribute("data-jk") || "";
            const link = titleLink?.getAttribute("href") || "";
            const absLink = buildJobLink(link, jobId);

            const key = `${title}|${company}|${location}|${jobId}`;
            if (seen.has(key)) continue;
            seen.add(key);

            jobs.push({ title, company, location, attributes, link: absLink, jobId });
        }

        return jobs;
    }

    function formatJobs(jobs) {
        return jobs
            .map((job) => {
                const attrs = job.attributes.join(", ");
                const link = job.link || "";
                return `${job.title} | ${job.company} | ${job.location} | ${attrs} | ${link}`.trim();
            })
            .join("\n");
    }

    browser.runtime.onMessage.addListener((message) => {
        if (!message?.type) return;

        if (message.type === "PARSE_INDEED") {
            try {
                const jobs = collectJobs();
                if (!jobs.length) {
                    return Promise.resolve({ error: "Вакансии не найдены. Откройте страницу поиска Indeed." });
                }

                const text = formatJobs(jobs);
                return Promise.resolve({ text, count: jobs.length });
            } catch (err) {
                return Promise.resolve({ error: err?.message || String(err) });
            }
        }

        if (message.type === "INJECT_CHANCES") {
            try {
                const chances = message.chances || [];
                // Remove old badges
                document.querySelectorAll(".jp-chance-badge").forEach(el => el.remove());

                const rows = Array.from(document.querySelectorAll("td.resultContent, div.resultContent"));
                const cards = rows.length ? rows : Array.from(document.querySelectorAll(".job_seen_beacon, .result"));

                for (const card of cards) {
                    const titleLink = card.querySelector("a.jcs-JobTitle") || card.querySelector("h2 a") || card.querySelector("a[data-jk]");
                    const titleEl = titleLink?.querySelector("span") || titleLink;
                    const title = textOrEmpty(titleEl).toLowerCase();
                    const company = textOrEmpty(card.querySelector("[data-testid='company-name']") || card.querySelector(".companyName")).toLowerCase();

                    if (!title && !company) continue;

                    // Find best match from AI results
                    let bestMatch = null;
                    let bestScore = 0;
                    for (const ch of chances) {
                        let score = 0;
                        const chCompany = (ch.company || "").toLowerCase();
                        const chTitle = (ch.title || "").toLowerCase();
                        if (company && chCompany && company.includes(chCompany)) score += 2;
                        if (company && chCompany && chCompany.includes(company)) score += 2;
                        if (title && chTitle && title.includes(chTitle.slice(0, 30))) score += 1;
                        if (title && chTitle && chTitle.includes(title.slice(0, 30))) score += 1;
                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = ch;
                        }
                    }

                    if (!bestMatch || bestScore < 2) continue;

                    // Mark as used to avoid duplicates
                    const idx = chances.indexOf(bestMatch);
                    if (idx !== -1) chances.splice(idx, 1);

                    const pct = parseInt(bestMatch.chance, 10) || 0;
                    const color = pct >= 70 ? "#00b894" : pct >= 40 ? "#fdcb6e" : "#e17055";
                    const textColor = pct >= 40 && pct < 70 ? "#2d3436" : "#fff";
                    const reason = bestMatch.reason || "";

                    const badge = document.createElement("div");
                    badge.className = "jp-chance-badge";
                    badge.textContent = `${pct}%`;
                    badge.style.cssText = `
                        position: absolute;
                        right: 8px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: ${color};
                        color: ${textColor};
                        font-weight: 800;
                        font-size: 15px;
                        padding: 6px 12px;
                        border-radius: 8px;
                        z-index: 9999;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        font-family: "Segoe UI", system-ui, sans-serif;
                        pointer-events: auto;
                        cursor: help;
                    `;

                    // Styled tooltip (fixed position to escape overflow)
                    if (reason) {
                        const tooltip = document.createElement("div");
                        tooltip.className = "jp-tooltip";
                        tooltip.textContent = reason;
                        tooltip.style.cssText = `
                            position: fixed;
                            background: #1a1a2e;
                            color: #dfe6e9;
                            font-size: 12px;
                            font-weight: 400;
                            line-height: 1.5;
                            padding: 10px 14px;
                            border-radius: 8px;
                            border: 1px solid rgba(108,92,231,0.3);
                            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                            max-width: 340px;
                            width: max-content;
                            z-index: 2147483647;
                            pointer-events: none;
                            opacity: 0;
                            transition: opacity 0.2s ease;
                            font-family: "Segoe UI", system-ui, sans-serif;
                        `;
                        document.body.appendChild(tooltip);

                        badge.addEventListener("mouseenter", () => {
                            const rect = badge.getBoundingClientRect();
                            tooltip.style.opacity = "1";
                            tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + "px";
                            tooltip.style.left = Math.max(8, rect.right - tooltip.offsetWidth) + "px";
                        });
                        badge.addEventListener("mouseleave", () => { tooltip.style.opacity = "0"; });
                    }

                    // Ensure parent is positioned
                    const parent = card.closest(".job_seen_beacon") || card.closest(".result") || card.parentElement;
                    if (parent) {
                        const pos = getComputedStyle(parent).position;
                        if (pos === "static") parent.style.position = "relative";
                        parent.style.overflow = "visible";
                        parent.appendChild(badge);
                    }
                }

                return Promise.resolve({ ok: true });
            } catch (err) {
                return Promise.resolve({ ok: false, error: err?.message || String(err) });
            }
        }
    });
})();
