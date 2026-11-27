// SCORM 1.2 communication (pipwerks wrapper).
// Based on the classroom reference; score uses each question's first check.
const SCORM_CONFIG = { passingScore: 60, maxResponseLength: 255 };
const firstResults = Array(quizData.questions.length).fill(null);
// Hints: hintsUsed = the hint was opened at some point; firstHints = it was open before the first check (this one counts for the score).
const hintsUsed = Array(quizData.questions.length).fill(false);
const firstHints = Array(quizData.questions.length).fill(null);
// Where the learner stopped, so a return to the same attempt continues from there (main.js restores it):
// answers = the last checked answer of each question, seen = parts of the unit already on screen,
// place = the part on screen last ([data-step] number).
const savedProgress = { answers: Array(quizData.questions.length).fill(null), seen: [], place: null };
let isResumedAttempt = false; // true when a stopped attempt was restored
let isAttemptRestored = false; // nothing is saved before the stored state was read
let isFinalized = false;
let reportingFailed = false;
let submittedScore = null;
let isScormConnected = false;
let canReport = false;

document.addEventListener('DOMContentLoaded', initScorm);
// Same close events as the classroom reference.
window.addEventListener('pagehide', closeScormSession);
window.addEventListener('beforeunload', closeScormSession);

function closeScormSession() {
    if (!isScormConnected) return false;
    isScormConnected = false; // guard against a second call (pagehide + beforeunload)

    try {
        const ok = pipwerks.SCORM.quit();
        if (!ok) {
            console.warn('[SCORM] quit (LMSFinish) failed');
        }
        return ok;
    } catch (error) {
        console.warn('[SCORM] quit (LMSFinish) failed:', error);
        return false;
    }
}

function initScorm() {
    // Make sure the wrapper was loaded
    if (!window.pipwerks || !pipwerks.SCORM) {
        console.warn('[SCORM] Wrapper not found – running in standalone mode.');
        showLmsNotice('standalone');
        return;
    }

    // init() also sets lesson_status to "incomplete" on a first launch (handleCompletionStatus)
    pipwerks.SCORM.version = '1.2';
    try {
        isScormConnected = pipwerks.SCORM.init();
    } catch (error) {
        console.warn('[SCORM] Connection unavailable – running in standalone mode.', error);
    }
    if (!isScormConnected) {
        console.info('[SCORM] No LMS found – running in standalone mode.');
        showLmsNotice('standalone');
        return;
    }

    // In review/browse mode the LMS does not save results (same rule as the classroom reference).
    const lessonMode = scormGet('cmi.core.lesson_mode');
    canReport = (lessonMode !== 'review' && lessonMode !== 'browse');
    if (!canReport) {
        showLmsNotice('review');
    } else {
        // init() does not return the result of the wrapper's internal Commit.
        // Confirm persistence explicitly without repeating its status writes.
        if (scormSave()) {
            showLmsNotice('connected');
        } else {
            reportingFailed = true;
            canReport = false;
            showLmsNotice('saveFailed');
        }
    }

    showLearnerName(scormGet('cmi.core.student_name'));
    if (canReport) restoreAttempt();
}

// Moodle returns "Last, First" – show it as "First Last"
function showLearnerName(rawName) {
    const nameEl = document.getElementById('learner-name');
    if (!nameEl) return;

    const name = (rawName || '').trim();
    if (!name) {
        nameEl.textContent = 'שלום וברוכים הבאים';
        return;
    }
    const parts = name.split(',').map(p => p.trim()).filter(Boolean);
    const displayName = parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
    nameEl.textContent = `שלום ${displayName}`;
}

// Tell the learner when results are not being saved
function showLmsNotice(kind) {
    const notice = document.getElementById('lms-notice');
    const MESSAGES = {
        saveFailed: 'החיבור למערכת הקורס נפתח, אך לא הצלחנו לאשר שמירה. אפשר לתרגל, אך דיווח התוצאות אינו זמין. פנו לצוות הקורס.',
        connected: 'החיבור למערכת הקורס פעיל. בדיקות התשובות נשמרות; הציון נשלח רק בלחיצה על ״סיום והגשת הלומדה״ בסוף היחידה.',
        resumed: 'חזרתם לניסיון שהתחלתם. התשובות שבדקתם והחלקים שכבר ראיתם נשמרו. הציון נשלח רק בלחיצה על ״סיום והגשת הלומדה״ בסוף היחידה.',
        reportFailed: 'לא הצלחנו לאשר את שמירת נתוני הניסיון. אפשר להמשיך לתרגל, אך לא נוכל לאשר הגשה. פנו לצוות הקורס.',
        finalized: 'בניסיון הזה כבר בוצעה הגשה. אפשר לתרגל שוב ללא שינוי הציון. לקבלת ציון חדש יש לפתוח ניסיון חדש במערכת הקורס.',
        standalone: 'היחידה פועלת מחוץ למערכת הקורס: אפשר לתרגל, אבל התשובות והציון לא יישמרו.',
        review: 'היחידה פתוחה במצב צפייה: התשובות והציון לא יישמרו. לניסיון חדש יש להיכנס מחדש מעמוד הקורס.'
    };
    if (notice) {
        notice.textContent = MESSAGES[kind] || '';
        notice.hidden = false;
    }
    if (kind === 'standalone') {
        const nameEl = document.getElementById('learner-name');
        if (nameEl) nameEl.textContent = 'שלום וברוכים הבאים';
    }
}

// Based on the classroom save helper, with a connection and exception guard.
function scormSave() {
    if (!isScormConnected || !canReport) return false;
    try {
        const ok = pipwerks.SCORM.save();
        if (!ok) {
            const code = pipwerks.SCORM.debug.getCode();
            console.warn(`[SCORM] save (LMSCommit) failed (error ${code})`);
        }
        return ok;
    } catch (error) {
        console.warn('[SCORM] save (LMSCommit) failed:', error);
        return false;
    }
}
// Classroom helper with guards for missing connections and failed reads.
function scormGet(field) {
    if (!isScormConnected) return '';
    try {
        const value = pipwerks.SCORM.get(field);
        const code = pipwerks.SCORM.debug.getCode();
        if (code !== 0) {
            console.warn(`[SCORM] get failed: ${field} (error ${code})`);
            return '';
        }
        return value === null || value === undefined ? '' : String(value);
    } catch (error) {
        console.warn('[SCORM] Could not read field:', field, error);
        return '';
    }
}

function scormSet(field, value) {
    if (!isScormConnected || !canReport) return false;
    try {
        const ok = pipwerks.SCORM.set(field, value);
        if (!ok) console.warn(`[SCORM] set failed: ${field} (error ${pipwerks.SCORM.debug.getCode()})`);
        return ok;
    } catch (error) {
        console.warn('[SCORM] set failed:', field, error);
        return false;
    }
}

function stopReporting() {
    reportingFailed = true;
    canReport = false;
    showLmsNotice('reportFailed');
}

// SCORM 1.2 interactions cannot be read back. Retain first checks separately.
function restoreAttempt() {
    const status = scormGet('cmi.core.lesson_status');
    if (['passed', 'failed', 'completed'].includes(status)) {
        isFinalized = true;
        const rawScore = scormGet('cmi.core.score.raw');
        submittedScore = rawScore === '' ? null : Number(rawScore);
        showLmsNotice('finalized');
        return;
    }
    const saved = scormGet('cmi.suspend_data');
    const count = scormGet('cmi.interactions._count');
    try {
        if (!status || !/^\d+$/.test(count)) throw new Error('Cannot read attempt state');
        if (!saved) {
            if (Number(count) > 0) throw new Error('First checks are missing');
            isAttemptRestored = true;
            return;
        }
        const state = JSON.parse(saved);
        const isList = (list, isValid) => Array.isArray(list) && list.length === firstResults.length && list.every(isValid);
        const isResult = value => value === null || typeof value === 'boolean';
        if (!isList(state.firstResults, isResult)) throw new Error('Invalid first checks');
        if (state.version === 1) {
            // Saved before hints existed: no hint was used.
            state.firstHints = state.firstResults.map(result => result === null ? null : false);
            state.hintsUsed = firstResults.map(() => false);
        } else if (![2, 3].includes(state.version) || !isList(state.firstHints, isResult) ||
            !isList(state.hintsUsed, value => typeof value === 'boolean') ||
            state.firstHints.some((hint, i) => (hint === null) !== (state.firstResults[i] === null))) {
            throw new Error('Invalid hint state');
        }
        // Version 3 also keeps the answers, the parts seen and the place (older versions start these empty).
        const isPartNumber = value => Number.isInteger(value) && value >= 0;
        if (state.version === 3 && (
            !isList(state.answers, value => value === null || (Array.isArray(value) && value.every(item => typeof item === 'string'))) ||
            !Array.isArray(state.seen) || !state.seen.every(isPartNumber) ||
            !(state.place === null || isPartNumber(state.place)))) {
            throw new Error('Invalid progress state');
        }
        firstResults.splice(0, firstResults.length, ...state.firstResults);
        firstHints.splice(0, firstHints.length, ...state.firstHints);
        hintsUsed.splice(0, hintsUsed.length, ...state.hintsUsed);
        if (state.version === 3) {
            savedProgress.answers = state.answers;
            savedProgress.seen = state.seen;
            savedProgress.place = state.place;
        }
        isAttemptRestored = true;
        isResumedAttempt = true;
        showLmsNotice('resumed');
    } catch (error) {
        console.warn('[SCORM] Could not restore attempt:', error);
        stopReporting();
    }
}

function formatTimeOfDay(date) {
    return [date.getHours(), date.getMinutes(), date.getSeconds()]
        .map(n => String(n).padStart(2, '0')).join(':');
}

// Classroom interaction fields; append on every valid check instead of submission.
function sendInteractionsToLMS(interactions) {
    if (!isScormConnected || !canReport || isFinalized) return false;
    const count = scormGet('cmi.interactions._count');
    if (!/^\d+$/.test(count)) return false;
    let index = Number(count);
    let allOk = true;
    const time = formatTimeOfDay(new Date());
    interactions.forEach(it => {
        const base = `cmi.interactions.${index}`;
        // Do not write other fields if the required id was rejected.
        if (!scormSet(`${base}.id`, it.id)) { allOk = false; return; }
        allOk = scormSet(`${base}.type`, it.type) && allOk;
        allOk = scormSet(`${base}.time`, time) && allOk;
        allOk = scormSet(`${base}.student_response`,
            String(it.student_response).slice(0, SCORM_CONFIG.maxResponseLength)) && allOk;
        allOk = scormSet(`${base}.result`, it.result) && allOk;
        // The hint line has no correct answer and no weight.
        if (it.correct_response !== undefined) allOk = scormSet(`${base}.correct_responses.0.pattern`, it.correct_response) && allOk;
        if (it.weighting !== undefined) allOk = scormSet(`${base}.weighting`, String(it.weighting)) && allOk;
        index += 1;
    });
    return allOk;
}

// The attempt state that SCORM 1.2 cannot read back: first checks, hint use and where the learner stopped.
function saveAttemptState() {
    return scormSet('cmi.suspend_data', JSON.stringify({ version: 3, firstResults, firstHints, hintsUsed, ...savedProgress }));
}
// Called by main.js when the learner reaches another part of the unit.
function saveProgress() {
    if (!isScormConnected || !canReport || isFinalized || !isAttemptRestored) return;
    if (!(saveAttemptState() && scormSave())) stopReporting();
}

// Opening a hint is saved right away, so reloading the page does not erase it.
function recordHintOpened(index) {
    if (isFinalized || hintsUsed[index]) return;
    hintsUsed[index] = true;
    if (!isScormConnected || !canReport) return;
    if (!(saveAttemptState() && scormSave())) stopReporting();
}

function recordQuestionCheck(index, selected, correct) {
    if (isFinalized) return;
    if (firstResults[index] === null) {
        firstResults[index] = correct;
        firstHints[index] = hintsUsed[index];
    }
    savedProgress.answers[index] = selected;
    if (!isScormConnected || !canReport) return;
    // Report answers as letters (a, b, c, ...) by their order in quizData.
    const question = quizData.questions[index];
    const letterOf = value => String.fromCharCode(97 + question.options.findIndex(option => option.value === value));
    // Choice: "b,c". Matching (SCORM 1.2 format): "1.a,2.b,3.d" - row number and chosen letter.
    const toPattern = values => question.type === 'matching' ?
        values.map((value, i) => `${i + 1}.${letterOf(value)}`).join(',') :
        question.options.filter(option => values.includes(option.value)).map(option => letterOf(option.value)).join(',');
    // Two lines per check: the answer, and right after it whether the hint was used (t = yes, f = no).
    let ok = sendInteractionsToLMS([{
        id: question.id, type: question.type === 'matching' ? 'matching' : 'choice',
        student_response: toPattern(selected),
        result: correct ? 'correct' : 'wrong', correct_response: toPattern(question.correct),
        weighting: question.points
    }, {
        id: `${question.id}_hint`, type: 'true-false',
        student_response: hintsUsed[index] ? 't' : 'f', result: 'neutral'
    }]);
    ok = saveAttemptState() && ok;
    ok = scormSave() && ok;
    if (!ok) stopReporting();
}

// Points for one question: only the first check counts; a hint opened before it lowers the points.
function questionPoints(index) {
    if (firstResults[index] !== true) return 0;
    const question = quizData.questions[index];
    return firstHints[index] ? question.hintPoints : question.points;
}
function calculateFinalScore() {
    return quizData.questions.reduce((sum, question, index) => sum + questionPoints(index), 0);
}

function finalizeAndCloseLMSConnection() {
    if (isFinalized) {
        return submittedScore === null ? 'הלומדה כבר הוגשה בניסיון הזה. הציון אינו משתנה.' :
            `הלומדה כבר הוגשה בניסיון הזה. הציון: ${submittedScore}. התרגול החוזר אינו משנה אותו.`;
    }
    if (firstResults.some(result => result === null)) return 'יש לבדוק את כל שלוש השאלות לפני הגשה.';
    isFinalized = true;
    submittedScore = calculateFinalScore();
    const status = submittedScore >= SCORM_CONFIG.passingScore ? 'passed' : 'failed';
    const summary = `הציון שלך: ${submittedScore}. ${status === 'passed' ? 'עברת' : 'לא עברת'} (ציון עובר: ${SCORM_CONFIG.passingScore}).`;
    if (!isScormConnected || !canReport) {
        return `${summary} ${reportingFailed ? 'לא ניתן לאשר שמירה עקב תקלה.' : 'הציון מוצג לתרגול בלבד ולא נשמר במערכת הקורס.'}`;
    }
    // Every interaction was already sent at check time; do not resend it here.
    let ok = scormSet('cmi.core.score.min', '0');
    ok = scormSet('cmi.core.score.max', '100') && ok;
    ok = scormSet('cmi.core.score.raw', String(submittedScore)) && ok;
    // Do not mark a finished attempt if a required score write failed.
    if (ok) ok = scormSet('cmi.core.lesson_status', status);
    ok = scormSet('cmi.core.exit', 'logout') && ok;
    ok = scormSave() && ok;
    const closed = closeScormSession();
    if (!ok || !closed) {
        showLmsNotice('reportFailed');
        return `${summary} לא הצלחנו לאשר שההגשה נשמרה במלואה. פנו לצוות הקורס.`;
    }
    showLmsNotice('finalized');
    return `${summary} ההגשה נשמרה במערכת הקורס. אפשר לסגור את החלון.`;
}
