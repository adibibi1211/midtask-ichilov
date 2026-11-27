// Show or hide a panel with Bootstrap's d-none class and keep aria-expanded in sync
// (based on the class toggleNav example).
function setPanelOpen(button, panel, isOpen) {
    panel.classList.toggle("d-none", !isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
}
function connectToggle(button, panel) {
    button.addEventListener("click", () => setPanelOpen(button, panel, panel.classList.contains("d-none")));
}

// Toggles: mobile menu, score explanation and credits.
const navButton = document.getElementById("navButton");
const mainNav = document.getElementById("mainNav");
connectToggle(navButton, mainNav);
connectToggle(document.getElementById("scoreInfoButton"), document.getElementById("scoreInfo"));
connectToggle(document.getElementById("creditsToggle"), document.getElementById("creditsContent"));
// Close the mobile menu after choosing a section.
mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setPanelOpen(navButton, mainNav, false)));

// Keep the cover shortcuts and the document tabs on the same selected page.
const documentTabs = Array.from(document.querySelectorAll(".file-tabs [role=tab]"));
function selectDocumentTab(tab) {
    for (const item of documentTabs) {
        const selected = item === tab;
        item.setAttribute("aria-selected", String(selected));
        item.tabIndex = selected ? 0 : -1;
        document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
    }

    tab.focus();
}

documentTabs.forEach(function (tab, index) {
    tab.addEventListener("click", () => selectDocumentTab(tab));
    tab.addEventListener("keydown", function (event) {
        // In RTL, the next tab appears to the left.
        const targets = {
            ArrowLeft: (index + 1) % documentTabs.length,
            ArrowRight: (index + documentTabs.length - 1) % documentTabs.length,
            Home: 0,
            End: documentTabs.length - 1
        };
        if (targets[event.key] !== undefined) {
            event.preventDefault();
            selectDocumentTab(documentTabs[targets[event.key]]);
        }
    });
});

document.querySelectorAll("[data-open]").forEach(function (button) {
    button.addEventListener("click", function () {
        const tab = document.getElementById("tab-" + button.dataset.open);
        selectDocumentTab(tab);
        tab.scrollIntoView({ block: "start" });
    });
});

// Step 2: build the "who to ask" flip cards from contactsData (js/contacts-data.js).
const contactCardsList = document.getElementById("contactCards");

function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    return element;
}
function createIcon(iconId) {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(svgNamespace, "svg");
    icon.setAttribute("class", "icon");
    icon.setAttribute("aria-hidden", "true");
    const iconUse = document.createElementNS(svgNamespace, "use");
    iconUse.setAttribute("href", "#" + iconId);
    icon.appendChild(iconUse);
    return icon;
}
// Only the visible side of a card can be reached by keyboard and screen readers.
function flipContactCard(card) {
    const isFlipped = card.classList.toggle("flipped");
    const [front, back] = card.querySelectorAll(".flip-face");
    front.inert = isFlipped;
    back.inert = !isFlipped;
    front.setAttribute("aria-hidden", String(isFlipped));
    back.setAttribute("aria-hidden", String(!isFlipped));
    (isFlipped ? back : front).querySelector(".flip-button").focus();
}

contactsData.contacts.forEach(function (contact) {
    const item = document.createElement("li");
    item.className = "col";
    const card = document.createElement("div");
    card.className = "flip-card";
    card.id = "contact_" + contact.id;
    const inner = document.createElement("div");
    inner.className = "flip-inner";

    // Front side: an illustration (decorative, the role is written below it), the role and a short summary.
    const front = document.createElement("div");
    front.className = "flip-face flip-front";
    const illustration = document.createElement("img");
    illustration.className = "contact-illustration";
    illustration.src = contact.image;
    illustration.alt = "";
    const topicsButton = createTextElement("button", "flip-button", "מה שואלים?");
    topicsButton.type = "button";
    topicsButton.setAttribute("aria-label", "מה שואלים? " + contact.role);
    topicsButton.appendChild(createIcon("i-flip"));
    front.append(illustration, createTextElement("h3", "contact-role", contact.role), createTextElement("p", "contact-summary", contact.summary), topicsButton);

    // Back side: the topics and an example of a focused question.
    const back = document.createElement("div");
    back.className = "flip-face flip-back";
    back.inert = true;
    back.setAttribute("aria-hidden", "true");
    const topicsList = document.createElement("ul");
    topicsList.className = "contact-topics";
    contact.topics.forEach(topic => topicsList.appendChild(createTextElement("li", "", topic)));
    const example = document.createElement("p");
    example.className = "contact-example";
    example.append(createTextElement("strong", "", "לדוגמה: "), document.createTextNode(contact.example));
    const backButton = createTextElement("button", "flip-button", "חזרה");
    backButton.type = "button";
    backButton.setAttribute("aria-label", "חזרה, " + contact.role);
    backButton.appendChild(createIcon("i-flip"));
    back.append(createTextElement("h3", "contact-role", "פונים אל " + contact.role + " בנושאים:"), topicsList, example, backButton);

    inner.append(front, back);
    card.appendChild(inner);
    item.appendChild(card);
    contactCardsList.appendChild(item);
    // A click anywhere on the front flips the card; on the back only the button does,
    // so reading or selecting the topics never flips it by mistake. The buttons give keyboard access.
    card.addEventListener("click", function (event) {
        // A glossary term on the card opens its explanation and does not flip the card.
        if (event.target.closest(".term")) return;
        if (card.classList.contains("flipped") && !event.target.closest("button")) return;
        flipContactCard(card);
    });
});

// Glossary terms: every term in the text can be clicked to open a short explanation (Bootstrap popover).
// The wording comes from the glossary window (#glossary), so each explanation is written only once.
const glossaryTerms = Array.from(document.querySelectorAll(".glossary-list dt"), function (term) {
    return { title: term.textContent, text: term.nextElementSibling.textContent, forms: term.dataset.forms.split("|") };
});
const allTermForms = glossaryTerms.flatMap(term => term.forms);
// A whole word, which may start with up to two Hebrew prefix letters (for example "בזימון", "ודף מידע").
const termPattern = new RegExp("(?<![א-ת])([הבלומשכ]{0,2}(?:" + allTermForms.join("|") + "))(?![א-ת])");
// Terms are not marked inside controls, headings or the learner's own notes.
const termSkip = "a, button, h1, h2, h3, legend, label, select, textarea, input, [role=tab], .modal, #noteForm, #questionList";
let openTerm = null;

function closeOpenTerm() {
    if (openTerm) bootstrap.Popover.getInstance(openTerm).hide();
}
function createTermButton(word) {
    const term = glossaryTerms.find(item => item.forms.some(form => word.endsWith(form)));
    const button = createTextElement("button", "term", word);
    button.type = "button";
    button.appendChild(createIcon("i-info"));
    button.setAttribute("aria-expanded", "false");
    // Bubble content: the term in bold, its explanation and a close (X) button.
    // The X is for mouse and touch; keyboard users close with Esc or by pressing the term again, so the X is not in the Tab order.
    const bubbleText = document.createElement("p");
    bubbleText.append(createTextElement("strong", "", term.title + ": "), document.createTextNode(term.text));
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "bubble-close";
    closeButton.tabIndex = -1;
    closeButton.setAttribute("aria-label", "סגירת ההסבר");
    closeButton.appendChild(createIcon("i-close"));
    closeButton.addEventListener("click", function () {
        closeOpenTerm();
        button.focus();
    });
    const bubbleContent = document.createElement("div");
    bubbleContent.className = "bubble-content";
    bubbleContent.append(bubbleText, closeButton);
    const bubble = new bootstrap.Popover(button, { content: bubbleContent, html: true, trigger: "manual", placement: "top", customClass: "term-bubble" });
    button.addEventListener("click", () => bubble.toggle());
    // Only one explanation is open at a time.
    button.addEventListener("show.bs.popover", function () {
        if (openTerm !== button) closeOpenTerm();
        openTerm = button;
        button.setAttribute("aria-expanded", "true");
    });
    button.addEventListener("hide.bs.popover", function () {
        if (openTerm === button) openTerm = null;
        button.setAttribute("aria-expanded", "false");
    });
    return button;
}
// Walk through the text of an element and turn every term into a button.
function markTerms(element) {
    Array.from(element.childNodes).forEach(function (node) {
        if (node.nodeType === Node.ELEMENT_NODE && !node.matches(termSkip)) markTerms(node);
        if (node.nodeType === Node.TEXT_NODE && termPattern.test(node.textContent)) {
            // split() keeps the found terms at the odd positions of the list.
            const parts = node.textContent.split(termPattern);
            node.replaceWith(...parts.map((part, i) => i % 2 ? createTermButton(part) : part));
        }
    });
}
document.querySelectorAll(".hero-copy, main").forEach(markTerms);

// Esc or a click outside the explanation closes it.
document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !openTerm) return;
    const term = openTerm;
    closeOpenTerm();
    term.focus();
});
document.addEventListener("click", function (event) {
    if (!event.target.closest(".term, .popover")) closeOpenTerm();
});

const quizForm = document.getElementById("quiz");
const questionSteps = Array.from(quizForm.querySelectorAll("fieldset"));
const quizFeedback = document.getElementById("quizFeedback");
const nextQuestionButton = document.getElementById("advance");
const checkAnswerButton = document.getElementById("check");
const previousQuestionButton = document.getElementById("back");
const questionProgressLabel = document.getElementById("stepLabel");
const progressDots = Array.from(document.querySelectorAll("#stepMeter span"));
const progressLines = Array.from(document.querySelectorAll("#stepMeter i"));
const quizCompletion = document.getElementById("finished");
const questionResults = Array(questionSteps.length).fill(null);
let currentQuestionIndex = 0;

// Quiz evaluation: every question is checked by the same rules from quizData (js/quiz-data.js).
function evaluateQuestion(question, selectedValues) {
    if (!selectedValues.length) return { message: "טרם נבחרה תשובה. בחרו תשובה כדי לבדוק אותה." };
    if (question.type === "matching") {
        // Each row is compared with the correct contact in the same position.
        if (selectedValues.includes("")) return { message: question.feedback.incomplete };
        const matches = selectedValues.filter((value, i) => value === question.correct[i]).length;
        if (matches === question.correct.length) return { correct: true, message: question.feedback.correct };
        if (matches === 0) return { correct: false, message: question.feedback.wrong };
        return { correct: false, message: question.feedback.partial.replace("{hits}", matches).replace("{total}", question.correct.length) };
    }
    // Single choice: every option has its own feedback.
    const option = question.options.find(item => item.value === selectedValues[0]);
    return { correct: question.correct.includes(option.value), message: option.feedback };
}

// Hints: every question has a hint button (from quizData), with its cost written next to it.
// Opening a hint is saved by scorm.js (recordHintOpened) for the score and the LMS report.
const hintButtons = questionSteps.map(function (step, index) {
    const question = quizData.questions[index];
    const hintBox = createTextElement("p", "hint-box d-none", question.hint);
    hintBox.id = "hint" + (index + 1);
    const hintCost = createTextElement("span", "hint-cost", "שימוש ברמז: " + question.hintPoints + " נקודות במקום " + question.points);
    hintCost.id = "hintCost" + (index + 1);
    const hintButton = createTextElement("button", "hint-toggle", "צריכים רמז?");
    hintButton.type = "button";
    hintButton.prepend(createIcon("i-help"));
    hintButton.setAttribute("aria-expanded", "false");
    hintButton.setAttribute("aria-controls", hintBox.id);
    hintButton.setAttribute("aria-describedby", hintCost.id);
    hintButton.addEventListener("click", () => recordHintOpened(index));
    connectToggle(hintButton, hintBox);
    const hintRow = document.createElement("div");
    hintRow.className = "hint-row";
    hintRow.append(hintButton, hintCost);
    step.querySelector(".hint").after(hintRow, hintBox);
    markTerms(hintBox);
    return hintButton;
});

// "How is the score set?": the points list is built from quizData, so it always matches the score.
const scorePoints = document.getElementById("scorePoints");
quizData.questions.forEach(function (question, index) {
    scorePoints.appendChild(createTextElement("li", "", "שאלה " + (index + 1) + ": " + question.points + " נקודות (" + question.hintPoints + " עם רמז)"));
});
function progressText(index) {
    return "שאלה " + (index + 1) + " מתוך " + questionSteps.length + " · " + quizData.questions[index].points + " נקודות";
}
questionProgressLabel.textContent = progressText(0);

function renderQuizFeedback() {
    const result = questionResults[currentQuestionIndex];
    closeOpenTerm();
    quizFeedback.textContent = result?.message || "";
    markTerms(quizFeedback);
    quizFeedback.classList.toggle("feedback-success", Boolean(result?.correct));
    // Wrong or partial answers are marked; missing answers and validation messages stay neutral.
    quizFeedback.classList.toggle("feedback-retry", result?.correct === false);
    nextQuestionButton.disabled = !result?.correct;
    nextQuestionButton.hidden = nextQuestionButton.disabled;
    checkAnswerButton.hidden = !nextQuestionButton.disabled;
    // A question answered correctly is locked: its answers cannot be changed, also when coming back to it
    // ("practice again" opens it again). Hint and glossary buttons keep working.
    const isLocked = Boolean(result?.correct);
    questionSteps[currentQuestionIndex].classList.toggle("locked", isLocked);
    questionSteps[currentQuestionIndex].querySelectorAll("input, select").forEach(field => { field.disabled = isLocked; });
}

// moveFocus is false only when a stopped attempt is restored on page load (the page must not jump to the quiz).
function showQuestion(index, moveFocus = true) {
    currentQuestionIndex = index;
    quizForm.parentElement.dataset.remaining = questionSteps.length - index;
    questionSteps.forEach((step, i) => { step.hidden = i !== index; });
    questionProgressLabel.textContent = progressText(index);
    // Fill the step circles up to the current question.
    progressDots.forEach((dot, i) => dot.classList.toggle("done", i <= index));
    progressLines.forEach((line, i) => line.classList.toggle("done", i < index));
    previousQuestionButton.hidden = index === 0;
    nextQuestionButton.textContent = index === questionSteps.length - 1 ? "לסיום התרגול" : "לשאלה הבאה";
    renderQuizFeedback();
    if (moveFocus) questionSteps[index].querySelector("legend").focus();
}

quizForm.addEventListener("submit", function (event) {
    event.preventDefault();
    // Checked answers for choice questions, or every list's value for the matching question.
    const selected = Array.from(questionSteps[currentQuestionIndex].querySelectorAll("input:checked, select"), field => field.value);
    questionResults[currentQuestionIndex] = evaluateQuestion(quizData.questions[currentQuestionIndex], selected);
    const result = questionResults[currentQuestionIndex];
    // Empty answers and over-selection are validation errors, not graded checks.
    if (typeof result.correct === "boolean") {
        recordQuestionCheck(currentQuestionIndex, selected, result.correct);
        updateFinishButton();
    }
    renderQuizFeedback();
    if (!nextQuestionButton.hidden) nextQuestionButton.focus();
});
quizForm.addEventListener("change", function () {
    questionResults[currentQuestionIndex] = null;
    renderQuizFeedback();
});
previousQuestionButton.addEventListener("click", () => showQuestion(currentQuestionIndex - 1));
nextQuestionButton.addEventListener("click", function () {
    if (!questionResults[currentQuestionIndex]?.correct) return;
    if (currentQuestionIndex < questionSteps.length - 1) {
        showQuestion(currentQuestionIndex + 1);
    } else {
        // A learner may have changed an earlier answer after returning to it.
        const unchecked = questionResults.findIndex(result => !result?.correct);
        if (unchecked !== -1) { showQuestion(unchecked); return; }
        // The quiz ends here; the score is submitted only at the end of the unit ("סיום והגשת הלומדה").
        document.getElementById("submitResult").textContent = isFinalized ?
            "הלומדה כבר הוגשה בניסיון הזה, והתרגול החוזר אינו משנה את הציון." :
            "צברתם " + calculateFinalScore() + " נקודות מתוך 100 (ציון עובר: " + SCORM_CONFIG.passingScore + "). הציון יוגש כשתלחצו על ״סיום והגשת הלומדה״ בסוף היחידה.";
        quizForm.parentElement.dataset.remaining = 0;
        quizForm.hidden = true;
        quizCompletion.hidden = false;
        quizCompletion.querySelector("h3").focus();
    }
});
document.getElementById("restart").addEventListener("click", function () {
    // Unlock every question before clearing the answers (the score does not change).
    questionSteps.forEach(function (step) {
        step.classList.remove("locked");
        step.querySelectorAll("input, select").forEach(field => { field.disabled = false; });
    });
    quizForm.reset();
    questionResults.fill(null);
    // Practice again starts with the hints closed (the score does not change).
    hintButtons.forEach(button => setPanelOpen(button, document.getElementById(button.getAttribute("aria-controls")), false));
    quizCompletion.hidden = true;
    quizForm.hidden = false;
    showQuestion(0);
});

// End of the unit: "סיום והגשת הלומדה" submits the score to the LMS (finalizeAndCloseLMSConnection in scorm.js).
// It works only after all three questions were checked and every part of the unit ([data-step]) was on screen.
const finishUnitButton = document.getElementById("finishUnit");
const finishNote = document.getElementById("finishNote");
const finishStatus = document.getElementById("finishStatus");
const unitParts = Array.from(document.querySelectorAll("[data-step]"));
const seenParts = new Set(); // filled by stepObserver below, while the learner scrolls

function isUnitReady() {
    return firstResults.every(result => result !== null) && unitParts.every(part => seenParts.has(part));
}
// Until it is ready the button stays reachable (aria-disabled, not disabled). Screen readers hear the short finishHint, sighted users see finishNote.
function updateFinishButton() {
    if (isFinalized) return;
    const ready = isUnitReady();
    finishUnitButton.setAttribute("aria-disabled", String(!ready));
    finishNote.hidden = ready;
    if (ready) finishUnitButton.removeAttribute("aria-describedby");
    else finishUnitButton.setAttribute("aria-describedby", "finishHint");
}
// The button can be used once. "הסתיימה" is true in every case; the status line says whether the score was saved.
function showUnitSubmitted() {
    finishUnitButton.disabled = true;
    finishUnitButton.removeAttribute("aria-disabled");
    finishUnitButton.removeAttribute("aria-describedby");
    finishUnitButton.textContent = "הלומדה הסתיימה";
    finishNote.hidden = true;
}
finishUnitButton.addEventListener("click", function () {
    if (!isUnitReady()) return;
    finishStatus.textContent = finalizeAndCloseLMSConnection();
    showUnitSubmitted();
});
// Back to an attempt that was stopped in the middle (state read by scorm.js): the checked answers,
// the opened hints, the parts already seen and a button back to the place where the learner stopped.
function restoreUnitProgress() {
    savedProgress.seen.forEach(function (index) {
        if (unitParts[index]) seenParts.add(unitParts[index]);
    });
    updateFinishButton();
    savedProgress.answers.forEach(function (values, index) {
        const question = quizData.questions[index];
        // Skip an answer that does not match the current options.
        if (!values || !values.every(value => value === "" || question.options.some(option => option.value === value))) return;
        const step = questionSteps[index];
        if (question.type === "matching") {
            step.querySelectorAll("select").forEach((select, i) => { select.value = values[i] || ""; });
        } else {
            step.querySelectorAll("input").forEach(input => { input.checked = values.includes(input.value); });
        }
        questionResults[index] = evaluateQuestion(question, values);
    });
    hintButtons.forEach(function (button, index) {
        if (hintsUsed[index]) setPanelOpen(button, document.getElementById(button.getAttribute("aria-controls")), true);
    });
    // The quiz opens on the first question that is not answered correctly yet.
    const firstOpen = questionResults.findIndex(result => !result?.correct);
    showQuestion(firstOpen === -1 ? questionSteps.length - 1 : firstOpen, false);

    const lastPart = unitParts[savedProgress.place];
    if (!lastPart || savedProgress.place === 0) return;
    const resumeButton = createTextElement("button", "action resume-button", "להמשיך מהמקום שעצרתם");
    resumeButton.type = "button";
    resumeButton.addEventListener("click", function () {
        const heading = lastPart.querySelector("h2");
        lastPart.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        resumeButton.remove();
    });
    document.getElementById("lms-notice").after(resumeButton);
}
// When the page loads: an attempt that was already submitted, or a stopped attempt to continue.
document.addEventListener("DOMContentLoaded", function () {
    if (isResumedAttempt && !isFinalized) restoreUnitProgress();
    if (!isFinalized) return;
    showUnitSubmitted();
    finishStatus.textContent = finalizeAndCloseLMSConnection();
});

// Personal questions and clipboard fallback.
const questionForm = document.getElementById("noteForm");
const questionList = document.getElementById("questionList");
const copyQuestionsButton = document.getElementById("copy");
const manualCopyField = document.getElementById("manualCopy");
const questionStatus = document.getElementById("noteStatus");
const questionInput = document.getElementById("myQuestion");
const questionTopicInput = document.getElementById("gap");
const questionRecipientSelect = document.getElementById("recipient");

function updateQuestionListStatus(message) {
    copyQuestionsButton.hidden = questionList.children.length === 0;
    manualCopyField.hidden = true;
    questionStatus.textContent = message;
}

// Mark a field as invalid or valid with Bootstrap validation classes.
function setFieldError(field, hasError) {
    field.classList.toggle("is-invalid", hasError);
    field.setAttribute("aria-invalid", String(hasError));
}

questionForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const question = questionInput.value.trim();
    const questionRecipient = questionRecipientSelect.value;
    setFieldError(questionRecipientSelect, !questionRecipient);
    setFieldError(questionInput, !question);
    const firstInvalidField = questionForm.querySelector(".is-invalid");
    if (firstInvalidField) {
        firstInvalidField.focus();
        return;
    }
    const questionTopic = questionTopicInput.value.trim();
    const questionEntry = document.createElement("li");
    questionEntry.dataset.topic = questionTopic;
    questionEntry.dataset.recipient = questionRecipient;
    questionEntry.dataset.question = question;
    const text = createTextElement("span", "", (questionTopic ? questionTopic + ". " : "") + questionRecipient + ": " + question);
    const removeQuestionButton = createTextElement("button", "", "הסרה");
    removeQuestionButton.type = "button";
    removeQuestionButton.setAttribute("aria-label", "הסרת השאלה: " + question);
    removeQuestionButton.addEventListener("click", function () {
        questionEntry.remove();
        updateQuestionListStatus("השאלה הוסרה.");
        questionInput.focus();
    });
    questionEntry.append(text, removeQuestionButton);
    questionList.append(questionEntry);
    questionForm.reset();
    updateQuestionListStatus("השאלה נוספה לרשימה.");
    questionTopicInput.focus();
});
// Clear a field's error as soon as the learner fixes it.
questionInput.addEventListener("input", () => setFieldError(questionInput, false));
questionRecipientSelect.addEventListener("change", () => setFieldError(questionRecipientSelect, false));

function formatQuestionsForCopy(questionEntries) {
    const blocks = Array.from(questionEntries, function (item, index) {
        const lines = ["שאלה " + (index + 1)];
        if (item.dataset.topic) lines.push("נושא: " + item.dataset.topic);
        lines.push("למי אפנה: " + item.dataset.recipient);
        lines.push("השאלה שלי: " + item.dataset.question);
        return lines.join("\n");
    });
    return "השאלות שלי לפגישה\n\n" + blocks.join("\n\n");
}

copyQuestionsButton.addEventListener("click", async function () {
    const formattedQuestions = formatQuestionsForCopy(questionList.children);
    try {
        await navigator.clipboard.writeText(formattedQuestions);
        questionStatus.textContent = "הרשימה הועתקה. אפשר להדביק אותה בפתקים בטלפון או בקובץ להדפסה ולהיעזר בה בפגישה.";
    } catch {
        manualCopyField.value = formattedQuestions;
        manualCopyField.hidden = false;
        manualCopyField.focus();
        manualCopyField.select();
        questionStatus.textContent = "הרשימה מסומנת. אפשר להעתיק אותה באמצעות פקודת ההעתקה במכשיר.";
    }
});

// Allow users to pause continuous motion (top-bar button).
// Screen readers hear "עצירת הנפשות" with its pressed state; the tooltip shows what the next click does.
const motionToggleButton = document.getElementById("motionToggle");
motionToggleButton.addEventListener("click", function () {
    const isPaused = document.body.classList.toggle("motion-paused");
    motionToggleButton.setAttribute("aria-pressed", String(isPaused));
    bootstrap.Tooltip.getInstance(motionToggleButton).setContent({ ".tooltip-inner": isPaused ? "הפעלת הנפשות" : "עצירת הנפשות" });
    updateScrollEffects();
});

// Ichilov marks: 2-3 faint marks per section (1 on phones), placed at random but never behind text.
const markTextAreas = ".hero-copy, .section-intro, .resource-heading";
const markGap = 70; // free space around text, so a mark stays clear of it even while moving on scroll
let brandMarks = [];

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}
function boxesTouch(a, b) {
    return a.left < b.right + markGap && a.right > b.left - markGap &&
        a.top < b.bottom + markGap && a.bottom > b.top - markGap;
}

function placeBrandMarks() {
    document.querySelectorAll(".brand-marks").forEach(function (container) {
        container.replaceChildren();
        const takenBoxes = Array.from(container.closest("section").querySelectorAll(markTextAreas), area => area.getBoundingClientRect());
        const markCount = window.innerWidth < 768 ? 1 : (Math.random() < 0.5 ? 2 : 3);
        for (let i = 0; i < markCount; i++) {
            const mark = document.createElement("img");
            mark.src = "assets/ichilov-mark.svg";
            mark.alt = "";
            mark.className = "brand-mark";
            mark.dataset.speed = randomBetween(0.025, 0.06) * (Math.random() < 0.5 ? -1 : 1);
            mark.dataset.turn = randomBetween(-30, 30);
            container.appendChild(mark);
            // Try a few random spots; drop the mark if every spot touches text or another mark.
            let placed = false;
            for (let attempt = 0; attempt < 20 && !placed; attempt++) {
                const size = randomBetween(3, 8) + "rem";
                mark.style.width = size;
                mark.style.height = size;
                mark.style.top = randomBetween(4, 86) + "%";
                mark.style.left = randomBetween(1, 92) + "%";
                const markBox = mark.getBoundingClientRect();
                placed = !takenBoxes.some(box => boxesTouch(markBox, box));
                if (placed) takenBoxes.push(markBox);
            }
            if (!placed) mark.remove();
        }
    });
    brandMarks = Array.from(document.querySelectorAll(".brand-mark"));
    updateScrollEffects();
}
// Place the marks once the page has its final layout, and again only when the width changes.
// (Phones fire "resize" while scrolling, when the address bar hides; the width stays the same.)
let marksWidth = 0;
let resizeTimer;
window.addEventListener("load", function () {
    marksWidth = window.innerWidth;
    placeBrandMarks();
});
window.addEventListener("resize", function () {
    if (window.innerWidth === marksWidth) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        marksWidth = window.innerWidth;
        placeBrandMarks();
    }, 300);
});

// Scroll effects: reading progress bar, header shadow and the Ichilov marks in the background.
const topBar = document.getElementById("topBar");
const scrollProgress = document.getElementById("scrollProgress");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let scrollFrameRequested = false;

function updateScrollEffects() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress.style.width = (maxScroll > 0 ? window.scrollY / maxScroll * 100 : 0) + "%";
    topBar.classList.toggle("scrolled", window.scrollY > 20);
    // Each mark moves and turns slowly relative to its own section, so it never leaves it.
    const canMove = !prefersReducedMotion && !document.body.classList.contains("motion-paused");
    brandMarks.forEach(function (mark) {
        // The movement is capped (one screen height x speed), so it always stays inside the gap around the text.
        const sectionTop = mark.closest("section").getBoundingClientRect().top;
        const cappedTop = Math.max(-window.innerHeight, Math.min(window.innerHeight, sectionTop));
        const shift = canMove ? cappedTop * mark.dataset.speed : 0;
        mark.style.transform = "translateY(" + shift + "px) rotate(" + (Number(mark.dataset.turn) + shift / 4) + "deg)";
    });
    scrollFrameRequested = false;
}
// Update at most once per frame while scrolling.
window.addEventListener("scroll", function () {
    if (!scrollFrameRequested) {
        scrollFrameRequested = true;
        requestAnimationFrame(updateScrollEffects);
    }
});
updateScrollEffects();

// The fixed header's real height (it grows with larger text). Measured without the
// "scrolled" shrink and with the phone menu closed, so the page always starts below it.
function updateBarHeight() {
    const wasScrolled = topBar.classList.contains("scrolled");
    const menuWasOpen = !mainNav.classList.contains("d-none");
    topBar.classList.add("no-transition");
    topBar.classList.remove("scrolled");
    mainNav.classList.add("d-none");
    document.documentElement.style.setProperty("--bar-height", topBar.offsetHeight + "px");
    topBar.classList.toggle("scrolled", wasScrolled);
    if (menuWasOpen) mainNav.classList.remove("d-none");
    void topBar.offsetHeight; // apply the restored state before animations come back
    topBar.classList.remove("no-transition");
}

// Text size: the learner can enlarge all text and return to the normal size.
// The choice is saved in the browser, so it stays for the whole use of the unit.
const textSizeButtons = Array.from(document.querySelectorAll(".size-button"));
const textSizeStatus = document.getElementById("textSizeStatus");
const textSizeNames = { normal: "רגיל", large: "בינוני", xlarge: "גדול" };
const textSizeStorageKey = "ichilovTextSize";

function applyTextSize(size, announce) {
    document.documentElement.classList.toggle("text-large", size === "large");
    document.documentElement.classList.toggle("text-xlarge", size === "xlarge");
    textSizeButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.size === size)));
    if (announce) textSizeStatus.textContent = "גודל הטקסט: " + textSizeNames[size];
    updateBarHeight();
}
textSizeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        applyTextSize(button.dataset.size, true);
        // Saving can be blocked (e.g. private mode or inside some LMS frames); the unit still works.
        try { localStorage.setItem(textSizeStorageKey, button.dataset.size); } catch { }
        if (marksWidth) placeBrandMarks();
    });
});

// Names of the top-bar buttons (data-bs-title), shown on hover and on keyboard focus (Bootstrap tooltip).
const tooltipOptions = { placement: "bottom", customClass: "bar-tooltip" };
const tooltipButtons = Array.from(document.querySelectorAll("[data-bs-title]"));
tooltipButtons.forEach(function (element) {
    new bootstrap.Tooltip(element, tooltipOptions);
    // After a click the name is no longer needed.
    element.addEventListener("click", () => bootstrap.Tooltip.getInstance(element).hide());
});
function hideAllTooltips() {
    tooltipButtons.forEach(element => bootstrap.Tooltip.getInstance(element).hide());
}
// A name does not stay on screen while scrolling.
window.addEventListener("scroll", hideAllTooltips, { passive: true });
// Esc closes a shown name without moving the mouse or the focus (WCAG 1.4.13, dismissible).
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") hideAllTooltips();
});
// When the glossary closes, focus returns to the book button (for keyboard users).
// The book's tooltip is then built again, so it does not pop up at that moment but still shows on the next hover.
const glossaryButton = document.getElementById("glossaryButton");
document.getElementById("glossary").addEventListener("hidden.bs.modal", function () {
    setTimeout(function () {
        bootstrap.Tooltip.getInstance(glossaryButton).dispose();
        new bootstrap.Tooltip(glossaryButton, tooltipOptions);
    });
});
let savedTextSize = "normal";
try { savedTextSize = localStorage.getItem(textSizeStorageKey) || "normal"; } catch { }
applyTextSize(textSizeNames[savedTextSize] ? savedTextSize : "normal", false);
window.addEventListener("resize", updateBarHeight);

// Current step: mark the matching menu link (CSS styles it by aria-current).
// The cover has no menu link, so reaching it clears the mark.
const menuLinks = Array.from(mainNav.querySelectorAll("a"));
const stepObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        // Remember that this part of the unit was on screen (needed for "סיום והגשת הלומדה").
        const partIndex = unitParts.indexOf(entry.target);
        const isNewPart = !seenParts.has(entry.target);
        seenParts.add(entry.target);
        updateFinishButton();
        // Save the parts seen and the current place, so a return to this attempt continues from here (scorm.js).
        // The cover (part 0) is not saved as a place: the page always opens there.
        if (isNewPart || (partIndex > 0 && savedProgress.place !== partIndex)) {
            savedProgress.seen = unitParts.filter(part => seenParts.has(part)).map(part => unitParts.indexOf(part));
            if (partIndex > 0) savedProgress.place = partIndex;
            saveProgress();
        }
        menuLinks.forEach(function (link) {
            if (link.getAttribute("href") === "#" + entry.target.id) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
    });
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("[data-step]").forEach(section => stepObserver.observe(section));

// Reveal content as it scrolls into view (CSS skips this when motion is reduced).
document.body.classList.add("js-motion");
const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(item => revealObserver.observe(item));
