// Contacts data model: who to ask about what (used to build the flip cards in step 2).
// Option values match the matching question in quiz-data.js.
const contactsData = {
    "contacts": [
        {
            "id": "coordinator",
            "role": "מתאמת הניתוחים",
            "image": "assets/contacts/coordinator.svg",
            "summary": "תיאום הפגישה ופרטי ההגעה",
            "topics": ["מועד הפגישה ושינוי מועד", "לאיזה בניין ולאיזו קומה להגיע", "שאלות על הזימון שקיבלתם"],
            "example": "לאיזה בניין ולאיזו קומה עליי להגיע?"
        },
        {
            "id": "clinic",
            "role": "צוות המרפאה",
            "image": "assets/contacts/clinic.svg",
            "summary": "מסמכים, בדיקות והכנות לביקור",
            "topics": ["אילו מסמכים ותוצאות בדיקה להביא", "הנחיות כלליות לקראת הביקור", "מה קורה במהלך הביקור במרפאה"],
            "example": "אילו מסמכים רפואיים עליי להביא לפגישה?"
        },
        {
            "id": "doctor",
            "role": "הרופא או הרופאה",
            "image": "assets/contacts/doctor.svg",
            "summary": "הניתוח וההחלמה",
            "topics": ["מה צפוי בניתוח עצמו", "ההחלמה אחרי הניתוח", "תרופות קבועות שאני לוקח או לוקחת"],
            "example": "כמה זמן נמשכת ההחלמה בדרך כלל?"
        },
        {
            "id": "anesthesia",
            "role": "צוות ההרדמה",
            "image": "assets/contacts/anesthesia.svg",
            "summary": "ההרדמה והבטיחות שלכם",
            "topics": ["סוג ההרדמה המתוכנן", "רגישויות ואלרגיות", "ניסיון קודם בהרדמה"],
            "example": "איזה סוג הרדמה מתוכנן עבורי?"
        }
    ]
};
