/* Tab 2 — Parse single vacancy details */

(function () {
    function textOrEmpty(node) {
        if (!node) return "";
        return node.textContent.replace(/\s+/g, " ").trim();
    }

    function collectListText(container) {
        if (!container) return [];
        const items = Array.from(container.querySelectorAll("li, button span"))
            .map((el) => textOrEmpty(el))
            .filter(Boolean);
        return Array.from(new Set(items));
    }

    function findSectionByHeadingText(text) {
        const headings = Array.from(document.querySelectorAll("h2, h3"));
        return headings.find((h) => h.textContent && h.textContent.includes(text));
    }

    function extractVacancyInfo() {
        const title =
            textOrEmpty(document.querySelector("h1")) ||
            textOrEmpty(document.querySelector("[data-testid='jobsearch-JobInfoHeader-title']")) ||
            textOrEmpty(document.querySelector("#jobDescriptionTitleHeading"));

        const company =
            textOrEmpty(document.querySelector("[data-testid='jobsearch-JobInfoHeader-companyName']")) ||
            textOrEmpty(document.querySelector(".jobsearch-CompanyInfoContainer .css-1m4cuuf")) ||
            textOrEmpty(document.querySelector(".jobsearch-CompanyInfoContainer"));

        const location =
            textOrEmpty(document.querySelector("#jobLocationText")) ||
            textOrEmpty(document.querySelector("[data-testid='jobsearch-JobInfoHeader-companyLocation']"));

        const benefits = collectListText(document.querySelector("#benefits"));

        const skillsHeading = findSectionByHeadingText("Fähigkeiten");
        const skills = skillsHeading
            ? collectListText(skillsHeading.closest("div")?.querySelector("ul"))
            : [];

        const langHeading = findSectionByHeadingText("Sprachen");
        const languages = langHeading
            ? collectListText(langHeading.closest("div")?.querySelector("ul"))
            : [];

        const description = textOrEmpty(document.querySelector("#jobDescriptionText"));

        const lines = [];
        if (title) lines.push(`Должность: ${title}`);
        if (company) lines.push(`Компания: ${company}`);
        if (location) lines.push(`Локация: ${location}`);
        if (benefits.length) lines.push(`Бонусы: ${benefits.join(", ")}`);
        if (skills.length) lines.push(`Навыки: ${skills.join(", ")}`);
        if (languages.length) lines.push(`Языки: ${languages.join(", ")}`);
        if (description) {
            lines.push("");
            lines.push("Описание:");
            lines.push(description);
        }

        return lines.join("\n").trim();
    }

    browser.runtime.onMessage.addListener((msg) => {
        if (!msg || msg.type !== "EXTRACT_VACANCY") return;
        const text = extractVacancyInfo();
        return Promise.resolve({ text });
    });
})();
