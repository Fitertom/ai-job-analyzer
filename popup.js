/* ── JP Complex — popup logic ── */

// ── DOM refs ──

const apiToggle = document.getElementById("apiToggle");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const settingsSave = document.getElementById("settingsSave");
const settingsCancel = document.getElementById("settingsCancel");
const apiKeyInput = document.getElementById("apiKeyInput");
const resumeInput = document.getElementById("resumeInput");
const systemPromptInput = document.getElementById("systemPromptInput");

const DEFAULT_SYSTEM_PROMPT = `Ты — опытный IT-рекрутер в Германии с 15-летним стажем. Ты отлично разбираешься в IT-рынке, требованиях к кандидатам и процессе найма. Язык: ТОЛЬКО русский.`;

const tabBtns = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const tab3btn = document.getElementById("tab3btn");

// Tab 1
const copyListBtn = document.getElementById("copyListBtn");
const tab1Status = document.getElementById("tab1Status");

// Tab 2
const copyVacancyBtn = document.getElementById("copyVacancyBtn");
const tab2Status = document.getElementById("tab2Status");
const tab2HintCopy = document.getElementById("tab2HintCopy");
const tab2HintApi = document.getElementById("tab2HintApi");
const aiVacancyWrap = document.getElementById("aiVacancyWrap");
const aiVacancyText = document.getElementById("aiVacancyText");
const copyAiVacancy = document.getElementById("copyAiVacancy");

// Tab 3
const toggleAnalysis = document.getElementById("toggleAnalysis");
const pickBtn = document.getElementById("pickBtn");
const refreshBtn = document.getElementById("refreshBtn");
const saveHtmlBtn = document.getElementById("saveHtmlBtn");
const saveJsonBtn = document.getElementById("saveJsonBtn");
const clearBtn = document.getElementById("clearBtn");
const probCount = document.getElementById("probCount");
const tableWrap = document.getElementById("tableWrap");
const tab3Status = document.getElementById("tab3Status");

let analysisOn = false;
let intervalId = null;

// ── Helpers ──

function setStatus(el, msg) {
    el.textContent = msg || "";
}

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function getActiveTab() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab;
}

// ── Tab switching ──

function switchTab(targetId) {
    tabBtns.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === targetId);
    });
    panels.forEach((p) => {
        p.classList.toggle("active", p.id === targetId);
    });
}

tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// ── API toggle ──

const tab1HintCopy = document.getElementById("tab1HintCopy");
const tab1HintApi = document.getElementById("tab1HintApi");
const tab1Format = document.getElementById("tab1Format");
const aiResponseWrap = document.getElementById("aiResponseWrap");
const aiResponseText = document.getElementById("aiResponseText");
const copyAiResponse = document.getElementById("copyAiResponse");

function applyApiMode(apiOn) {
    if (apiOn) {
        tab3btn.classList.add("hidden-tab");
        if (document.getElementById("tab3").classList.contains("active")) {
            switchTab("tab1");
        }
        copyListBtn.textContent = "🤖 Рассчитать шансы";
        tab1HintCopy.classList.add("hidden");
        tab1HintApi.classList.remove("hidden");
        tab1Format.classList.add("hidden");
        // Tab 2 API mode
        copyVacancyBtn.textContent = "🤖 Обзор вакансии";
        tab2HintCopy.classList.add("hidden");
        tab2HintApi.classList.remove("hidden");
    } else {
        tab3btn.classList.remove("hidden-tab");
        copyListBtn.textContent = "Скопировать вакансии";
        tab1HintCopy.classList.remove("hidden");
        tab1HintApi.classList.add("hidden");
        tab1Format.classList.remove("hidden");
        aiResponseWrap.classList.add("hidden");
        // Tab 2 copy mode
        copyVacancyBtn.textContent = "Скопировать инфо";
        tab2HintCopy.classList.remove("hidden");
        tab2HintApi.classList.add("hidden");
        aiVacancyWrap.classList.add("hidden");
    }
}

apiToggle.addEventListener("change", () => {
    const on = apiToggle.checked;
    browser.storage.local.set({ jp_api_enabled: on });
    applyApiMode(on);
});

// ── Settings modal ──

settingsBtn.addEventListener("click", async () => {
    const data = await browser.storage.local.get(["jp_api_key", "jp_resume", "jp_system_prompt"]);
    apiKeyInput.value = data.jp_api_key || "";
    resumeInput.value = data.jp_resume || "";
    systemPromptInput.value = data.jp_system_prompt || DEFAULT_SYSTEM_PROMPT;
    settingsModal.classList.remove("hidden");
});

settingsCancel.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
});

document.querySelector(".modal-backdrop")?.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
});

settingsSave.addEventListener("click", async () => {
    await browser.storage.local.set({
        jp_api_key: apiKeyInput.value.trim(),
        jp_resume: resumeInput.value.trim(),
        jp_system_prompt: systemPromptInput.value.trim()
    });
    settingsModal.classList.add("hidden");
});

async function callGeminiApi(apiKey, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": apiKey
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`API ${res.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts || !parts.length) throw new Error("Пустой ответ от API.");
    return parts.map(p => p.text || "").join("");
}
// ── Parse AI table response ──

function parseAiChances(text) {
    const lines = text.split("\n");
    const results = [];

    for (const line of lines) {
        // Skip empty lines, header separators (---), and header rows
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("---") || /^\|?\s*-+/.test(trimmed)) continue;
        if (/шанс|chance/i.test(trimmed) && /компания|company/i.test(trimmed)) continue;

        // Split by | and clean up
        const parts = trimmed.split("|").map(p => p.trim()).filter(Boolean);
        if (parts.length < 3) continue;

        const chanceStr = parts[0].replace(/[^0-9]/g, "");
        const chance = parseInt(chanceStr, 10);
        if (isNaN(chance)) continue;

        results.push({
            chance: String(chance),
            company: parts[1] || "",
            title: parts[2] || "",
            reason: parts[3] || ""
        });
    }

    return results;
}

// ── Tab 1: Copy or Calculate ──

copyListBtn.addEventListener("click", async () => {
    const isApiMode = apiToggle.checked;
    copyListBtn.disabled = true;
    setStatus(tab1Status, "Сканирую страницу...");
    aiResponseWrap.classList.add("hidden");

    try {
        const tab = await getActiveTab();
        if (!tab?.id) {
            setStatus(tab1Status, "Нет активной вкладки.");
            return;
        }

        const response = await browser.tabs.sendMessage(tab.id, { type: "PARSE_INDEED" });
        if (!response || response.error) {
            setStatus(tab1Status, response?.error || "Не удалось получить данные.");
            return;
        }

        if (!isApiMode) {
            // Copy mode
            await navigator.clipboard.writeText(response.text);
            setStatus(tab1Status, `✓ Скопировано: ${response.count} вакансий`);
            return;
        }

        // API mode — send to Gemini
        setStatus(tab1Status, "Загружаю настройки...");
        const settings = await browser.storage.local.get(["jp_api_key", "jp_resume", "jp_system_prompt"]);
        const apiKey = settings.jp_api_key;
        const resume = settings.jp_resume;
        const sysPrompt = settings.jp_system_prompt || DEFAULT_SYSTEM_PROMPT;

        if (!apiKey) {
            setStatus(tab1Status, "⚠ Укажите API ключ в настройках (⚙).");
            return;
        }
        if (!resume) {
            setStatus(tab1Status, "⚠ Укажите резюме в настройках (⚙).");
            return;
        }

        setStatus(tab1Status, `🤖 Отправляю ${response.count} вакансий в Gemini...`);

        const prompt = `${sysPrompt}

У тебя есть резюме кандидата и список вакансий.

Задача: оцени шанс кандидата получить приглашение на собеседование по каждой вакансии.

Ответь ТОЛЬКО таблицей (без markdown-заголовков) в формате:
Шанс (%) | Компания | Должность | Подробное обоснование (2-3 предложения: почему такой процент, какие навыки совпали или нет, что является плюсом или минусом)

Важно: в колонке "Подробное обоснование" пиши развёрнуто — это будет показано пользователю как тултип при наведении.

Язык: ТОЛЬКО русский. Всё обоснование писать на русском языке.

Сортируй по убыванию шанса.

=== РЕЗЮМЕ КАНДИДАТА ===
${resume}

=== СПИСОК ВАКАНСИЙ ===
${response.text}`;

        const aiText = await callGeminiApi(apiKey, prompt);
        aiResponseText.textContent = aiText;
        aiResponseWrap.classList.remove("hidden");
        // Persist AI response
        await browser.storage.local.set({ jp_ai_response: aiText });

        // Parse AI response table and inject badges into page
        setStatus(tab1Status, "📌 Прикрепляю шансы к вакансиям...");
        const chances = parseAiChances(aiText);
        if (chances.length) {
            await browser.tabs.sendMessage(tab.id, { type: "INJECT_CHANCES", chances });
        }
        setStatus(tab1Status, `✓ Готово! ${response.count} вакансий, ${chances.length} оценок.`);

    } catch (err) {
        setStatus(tab1Status, "Ошибка: " + (err?.message || err));
    } finally {
        copyListBtn.disabled = false;
    }
});

// Copy AI response button
copyAiResponse.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(aiResponseText.textContent);
        copyAiResponse.textContent = "✓";
        setTimeout(() => { copyAiResponse.textContent = "📋"; }, 1500);
    } catch (err) {
        // ignore
    }
});

// ── Tab 2: Copy or AI Review vacancy ──

copyVacancyBtn.addEventListener("click", async () => {
    const isApiMode = apiToggle.checked;
    copyVacancyBtn.disabled = true;
    setStatus(tab2Status, "Собираю данные...");
    aiVacancyWrap.classList.add("hidden");

    try {
        const tab = await getActiveTab();
        if (!tab?.id) {
            setStatus(tab2Status, "Нет активной вкладки.");
            return;
        }

        const response = await browser.tabs.sendMessage(tab.id, { type: "EXTRACT_VACANCY" });
        if (!response || !response.text) {
            setStatus(tab2Status, "Данные не найдены на странице.");
            return;
        }

        if (!isApiMode) {
            await navigator.clipboard.writeText(response.text);
            setStatus(tab2Status, "✓ Скопировано в буфер обмена.");
            return;
        }

        // API mode — send to Gemini for review
        setStatus(tab2Status, "Загружаю настройки...");
        const settings = await browser.storage.local.get(["jp_api_key", "jp_resume", "jp_system_prompt"]);
        const apiKey = settings.jp_api_key;
        const resume = settings.jp_resume;
        const sysPrompt = settings.jp_system_prompt || DEFAULT_SYSTEM_PROMPT;

        if (!apiKey) {
            setStatus(tab2Status, "⚠ Укажите API ключ в настройках (⚙).");
            return;
        }
        if (!resume) {
            setStatus(tab2Status, "⚠ Укажите резюме в настройках (⚙).");
            return;
        }

        setStatus(tab2Status, "🤖 Анализирую вакансию...");

        const prompt = `${sysPrompt}

У тебя есть резюме кандидата и описание конкретной вакансии.

Сделай подробный обзор:

1. **Шанс на собеседование** — оцени в % и объясни почему.
2. **Совпадение навыков** — какие навыки кандидата совпадают с требованиями, какие нет.
3. **Плюсы кандидата** — сильные стороны для этой позиции.
4. **Минусы / риски** — что может помешать.
5. **Рекомендация** — стоит ли подавать, и если да, на что обратить внимание в сопроводительном письме.
6. **Советы по подготовке** — на какие вопросы готовиться к собеседованию.

Пиши структурированно, используя эмодзи для секций. Язык: русский.

=== РЕЗЮМЕ КАНДИДАТА ===
${resume}

=== ВАКАНСИЯ ===
${response.text}`;

        const aiText = await callGeminiApi(apiKey, prompt);
        aiVacancyText.textContent = aiText;
        aiVacancyWrap.classList.remove("hidden");
        await browser.storage.local.set({ jp_ai_vacancy: aiText });
        setStatus(tab2Status, "✓ Обзор готов!");

    } catch (err) {
        setStatus(tab2Status, "Ошибка: " + (err?.message || err));
    } finally {
        copyVacancyBtn.disabled = false;
    }
});

// Copy AI vacancy review button
copyAiVacancy.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(aiVacancyText.textContent);
        copyAiVacancy.textContent = "✓";
        setTimeout(() => { copyAiVacancy.textContent = "📋"; }, 1500);
    } catch (err) {
        // ignore
    }
});

// ── Tab 3: Probability collector ──

function buildTable(jobs) {
    const header = ["Шанс", "Компания", "Оценка", "Ссылка"];
    let html = '<table class="prob-table"><thead><tr>';
    for (const h of header) html += `<th>${h}</th>`;
    html += "</tr></thead><tbody>";

    for (const job of jobs) {
        const linkHtml = job.link
            ? `<a target="_blank" rel="noopener" href="${escapeHtml(job.link)}">Link</a>`
            : "";
        html += "<tr>";
        html += `<td><b>${escapeHtml(job.chance)}</b></td>`;
        html += `<td><b>${escapeHtml(job.company)}</b></td>`;
        html += `<td>${escapeHtml(job.assessment)}</td>`;
        html += `<td>${linkHtml}</td>`;
        html += "</tr>";
    }

    html += "</tbody></table>";
    return html;
}

async function ensureInjected(tabId) {
    try {
        await browser.tabs.executeScript(tabId, { file: "inject.js" });
    } catch (err) {
        // ignore
    }
}

async function refreshProbability() {
    setStatus(tab3Status, "Загружаю...");
    try {
        const tab = await getActiveTab();
        if (tab?.id) {
            try {
                await browser.tabs.sendMessage(tab.id, { type: "FORCE_COLLECT" });
            } catch (err) {
                await ensureInjected(tab.id);
                try {
                    await browser.tabs.sendMessage(tab.id, { type: "FORCE_COLLECT" });
                } catch (err2) {
                    // ignore
                }
            }
        }
        const res = await browser.runtime.sendMessage({ type: "GET_JOBS" });
        const jobs = res?.jobs || [];
        probCount.textContent = String(jobs.length);
        tableWrap.innerHTML = jobs.length ? buildTable(jobs) : "";
        setStatus(tab3Status, jobs.length ? "" : "Пока нет данных. Прокрутите страницу Gemini.");
    } catch (err) {
        setStatus(tab3Status, "Ошибка: " + (err?.message || err));
    }
}

function startAnalysis() {
    if (intervalId) return;
    intervalId = setInterval(() => refreshProbability(), 500);
}

function stopAnalysis() {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
}

toggleAnalysis.addEventListener("click", () => {
    analysisOn = !analysisOn;
    toggleAnalysis.textContent = analysisOn ? "Выключить" : "Включить";
    if (analysisOn) {
        setStatus(tab3Status, "Анализ включен (обновление каждые 0.5с).");
        startAnalysis();
    } else {
        setStatus(tab3Status, "Анализ выключен.");
        stopAnalysis();
    }
});

pickBtn.addEventListener("click", async () => {
    setStatus(tab3Status, "Пипетка: кликните по таблице.");
    try {
        const tab = await getActiveTab();
        if (!tab?.id) return;
        try {
            await browser.tabs.sendMessage(tab.id, { type: "START_PICK" });
        } catch (err) {
            await ensureInjected(tab.id);
            try {
                await browser.tabs.sendMessage(tab.id, { type: "START_PICK" });
            } catch (err2) {
                setStatus(tab3Status, "Не удалось запустить пипетку.");
            }
        }
    } catch (err) {
        setStatus(tab3Status, "Ошибка: " + (err?.message || err));
    }
});

refreshBtn.addEventListener("click", refreshProbability);

saveHtmlBtn.addEventListener("click", async () => {
    setStatus(tab3Status, "Готовлю файл...");
    try {
        const res = await browser.runtime.sendMessage({ type: "GET_JOBS" });
        const jobs = res?.jobs || [];
        if (!jobs.length) { setStatus(tab3Status, "Нет данных."); return; }
        const tHtml = buildTable(jobs);
        const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>JP Complex</title><body>${tHtml}</body></html>`;
        const saveRes = await browser.runtime.sendMessage({ type: "SAVE_HTML", html });
        setStatus(tab3Status, saveRes?.ok ? "✓ Файл сохранён." : "Ошибка: " + (saveRes?.error || "unknown"));
    } catch (err) {
        setStatus(tab3Status, "Ошибка: " + (err?.message || err));
    }
});

saveJsonBtn.addEventListener("click", async () => {
    setStatus(tab3Status, "Готовлю JSON...");
    try {
        const res = await browser.runtime.sendMessage({ type: "GET_JOBS" });
        const jobs = res?.jobs || [];
        if (!jobs.length) { setStatus(tab3Status, "Нет данных."); return; }
        const saveRes = await browser.runtime.sendMessage({ type: "SAVE_JSON", data: jobs });
        setStatus(tab3Status, saveRes?.ok ? "✓ JSON сохранён." : "Ошибка: " + (saveRes?.error || "unknown"));
    } catch (err) {
        setStatus(tab3Status, "Ошибка: " + (err?.message || err));
    }
});

clearBtn.addEventListener("click", async () => {
    setStatus(tab3Status, "Очищаю...");
    try {
        await browser.runtime.sendMessage({ type: "CLEAR_JOBS" });
        await refreshProbability();
    } catch (err) {
        setStatus(tab3Status, "Ошибка: " + (err?.message || err));
    }
});

// ── Init ──

(async () => {
    const data = await browser.storage.local.get(["jp_api_enabled", "jp_ai_response", "jp_ai_vacancy"]);
    const apiOn = !!data.jp_api_enabled;
    apiToggle.checked = apiOn;
    applyApiMode(apiOn);

    // Restore last AI responses
    if (data.jp_ai_response) {
        aiResponseText.textContent = data.jp_ai_response;
        aiResponseWrap.classList.remove("hidden");
    }
    if (data.jp_ai_vacancy) {
        aiVacancyText.textContent = data.jp_ai_vacancy;
        aiVacancyWrap.classList.remove("hidden");
    }

    // Load initial probability count
    try {
        const res = await browser.runtime.sendMessage({ type: "GET_JOBS" });
        probCount.textContent = String((res?.jobs || []).length);
    } catch (err) {
        // ignore
    }
})();
