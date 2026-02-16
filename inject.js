(function () {
    if (window.__jpComplexInjectLoaded) return;
    window.__jpComplexInjectLoaded = true;

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

    function startPicker() {
        if (window.__jpComplexPickerActive) return;
        window.__jpComplexPickerActive = true;

        const style = document.createElement("style");
        style.textContent = "[data-jp-pick]{outline:2px solid #6c5ce7 !important;}";
        style.dataset.jpPickStyle = "1";
        document.documentElement.appendChild(style);

        function clearHighlight() {
            const prev = document.querySelector("[data-jp-pick]");
            if (prev) prev.removeAttribute("data-jp-pick");
        }

        function onMove(e) {
            const path = e.composedPath ? e.composedPath() : [];
            const el = path.find((n) => n && n.nodeType === Node.ELEMENT_NODE);
            if (!el) return;
            clearHighlight();
            el.setAttribute("data-jp-pick", "1");
        }

        function findTableFromPath(path) {
            for (const node of path) {
                if (node && node.nodeType === Node.ELEMENT_NODE && node.tagName === "TABLE") {
                    return node;
                }
            }
            return null;
        }

        function onClick(e) {
            e.preventDefault();
            e.stopPropagation();
            const path = e.composedPath ? e.composedPath() : [];
            const table = findTableFromPath(path) || (e.target && e.target.closest ? e.target.closest("table") : null);
            if (table) {
                const jobs = extractRows(table);
                if (jobs.length) {
                    browser.runtime.sendMessage({ type: "ADD_JOBS", jobs });
                }
            }
            stopPicker();
        }

        function onKey(e) {
            if (e.key === "Escape") stopPicker();
        }

        function stopPicker() {
            window.__jpComplexPickerActive = false;
            clearHighlight();
            document.removeEventListener("mousemove", onMove, true);
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("keydown", onKey, true);
            const st = document.querySelector("style[data-jp-pick-style]");
            if (st) st.remove();
        }

        document.addEventListener("mousemove", onMove, true);
        document.addEventListener("click", onClick, true);
        document.addEventListener("keydown", onKey, true);
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
        if (message.type === "START_PICK") {
            startPicker();
            return Promise.resolve({ ok: true });
        }
    });
})();
