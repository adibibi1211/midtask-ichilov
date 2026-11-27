// Quiz data model: one place for questions, points, correct answers, hints and feedback.
// points: a correct first check without a hint; hintPoints: a correct first check after opening the hint.
// Option order must match the order of the inputs in index.html (SCORM letters a, b, c).
const quizData = {
    "questions": [
        {
            "id": "Q1_focused_question",
            "points": 40,
            "hintPoints": 30,
            "type": "single",
            "correct": ["specific"],
            "hint": "חפשו את השאלה שמזכירה מה כבר כתוב בזימון, ואומרת מה בדיוק עוד חסר.",
            "options": [
                { "value": "general", "feedback": "זו שאלה שאפשר לשאול, אבל היא כללית. נסו לבחור שאלה שמציינת מה כבר יש ליעל ומה בדיוק היא רוצה לברר." },
                { "value": "specific", "feedback": "נכון. השאלה מציינת מה כבר יש ליעל ומה עדיין חסר לה. כך הצוות יכול להבין מה היא צריכה ולתת תשובה ממוקדת." },
                { "value": "summary", "feedback": "זו שאלה שאפשר לשאול, אבל היא כללית. נסו לבחור שאלה שמציינת מה כבר יש ליעל ומה בדיוק היא רוצה לברר." }
            ]
        },
        {
            // Application question: the learner uses the case from the dossier to choose the right request.
            "id": "Q2_clarify_date_documents",
            "points": 20,
            "hintPoints": 15,
            "type": "single",
            "correct": ["both"],
            "hint": "השוו בין התאריך בזימון לתאריך בדף המידע, ובדקו מה כתוב על המסמכים. איזו פנייה מתייחסת לשני הדברים?",
            "options": [
                { "value": "date", "feedback": "הפנייה מזכירה שיש שני תאריכים, אבל לא אומרת אילו. בנוסף, היא לא שואלת אילו מסמכים להביא." },
                { "value": "documents", "feedback": "הפנייה עוזרת לברר את המסמכים, אבל לא את התאריך. יעל עלולה להגיע ביום הלא נכון." },
                { "value": "both", "feedback": "נכון. הפנייה מציינת את שני התאריכים, כך שהצוות מבין מיד שיש סתירה ויכול לאשר את המועד הנכון. היא גם שואלת אילו מסמכים להביא, וכך יעל משלימה את שני הפרטים החסרים בפנייה אחת." },
                { "value": "guess", "feedback": "זו החלטה בלי בירור. אין סיבה להניח שהזימון נכון יותר מדף המידע, ו״כל המסמכים״ לא מבטיח שיעל תביא את המסמך הנדרש." }
            ]
        },
        {
            "id": "Q3_match_contacts",
            "points": 40,
            "hintPoints": 30,
            "type": "matching",
            // One correct contact for each question row, in the order of the rows in index.html.
            "correct": ["coordinator", "clinic", "anesthesia"],
            "hint": "הפכו את הכרטיסים בשלב 2. על כל כרטיס כתובים הנושאים שאיש הצוות אחראי עליהם.",
            "options": [
                { "value": "coordinator" },
                { "value": "clinic" },
                { "value": "doctor" },
                { "value": "anesthesia" }
            ],
            "feedback": {
                "correct": "נכון. פרטי הגעה מבררים עם מתאמת הניתוחים, מסמכים ובדיקות עם צוות המרפאה, ושאלות על ההרדמה עם צוות ההרדמה. כשהשאלה מגיעה לאדם הנכון, התשובה מהירה ומדויקת יותר.",
                "partial": "תשובה חלקית: {hits} מתוך {total} התאמות נכונות. היעזרו בכרטיסים של שלב 2 ובדקו מי אחראי על כל נושא.",
                "wrong": "עדיין אין התאמה נכונה. חזרו לכרטיסים ״למי פונים עם מה?״ ובדקו מי אחראי על כל נושא.",
                "incomplete": "יש להתאים איש צוות לכל אחת מהשאלות לפני הבדיקה."
            }
        }
    ]
};
