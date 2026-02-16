/* Tab 3 — Collect Gemini probability tables */

(function () {
    function normalizeText(text) {
        return String(text || "")
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function extractCompanyFromCell(cell) {
        if (!cell) return "";
        const bold = cell.querySelector("b");
        if (bold) return normalizeText(bold.textContent);
        return "";
    }

    function extractLinkFromCell(cell) {
        if (!cell) return "";
        const linkEl = cell.querySelector("a[href]");
        if (!linkEl) return "";
        return linkEl.getAttribute("href") || "";
    }

    function extractRows(table) {
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        const results = [];

        for (const row of rows) {
            const cells = Array.from(row.querySelectorAll("td"));
            if (cells.length < 2) continue;

            const chance = normalizeText(cells[0].textContent);
            let company = "";
            let assessment = "";
            let link = "";

            if (cells.length >= 4) {
                company = normalizeText(cells[1].textContent);
                assessment = normalizeText(cells[2].textContent);
                link = extractLinkFromCell(cells[3]);
            } else {
                link = extractLinkFromCell(cells[1]);
                company = extractCompanyFromCell(cells[1]);
            }

            if (!chance && !company && !assessment && !link) continue;

            const key = `${chance}|${company}|${link}`;
            results.push({ key, chance, company, assessment, link });
        }

        return results;
    }

    function collectTablesDeep(root) {
        const out = [];
        const stack = [root];

        while (stack.length) {
            const node = stack.pop();
            if (!node) continue;

            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node;
                if (el.tagName === "TABLE") out.push(el);
                if (el.shadowRoot) stack.push(el.shadowRoot);
                const children = el.children;
                for (let i = children.length - 1; i >= 0; i -= 1) {
                    stack.push(children[i]);
                }
            } else if (node instanceof ShadowRoot || node instanceof DocumentFragment) {
                const children = node.children || node.childNodes;
                for (let i = children.length - 1; i >= 0; i -= 1) {
                    stack.push(children[i]);
                }
            }
        }

        return out;
    }

    function collectAll(root) {
        root = root || document.documentElement;
        const tables = collectTablesDeep(root);
        const all = [];
        for (const table of tables) {
            all.push(...extractRows(table));
        }
        return all;
    }

    let debounceTimer = null;

    function scheduleCollect() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            try {
                const jobs = collectAll();
                if (!jobs.length) return;
                await browser.runtime.sendMessage({ type: "ADD_JOBS", jobs });
            } catch (err) {
                // silent
            }
        }, 400);
    }

    function startObservers() {
        scheduleCollect();
        const observer = new MutationObserver(() => scheduleCollect());
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener("scroll", () => scheduleCollect(), { passive: true });
    }

    startObservers();

    browser.runtime.onMessage.addListener((message) => {
        if (!message?.type) return;
        if (message.type === "FORCE_COLLECT") {
            try {
                const jobs = collectAll();
                if (jobs.length) {
                    browser.runtime.sendMessage({ type: "ADD_JOBS", jobs });
                }
                return Promise.resolve({ ok: true, count: jobs.length });
            } catch (err) {
                return Promise.resolve({ ok: false, error: err?.message || String(err) });
            }
        }
    });
})();
