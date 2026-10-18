<?php
/*
 * דוגמה בלבד. בשרת יוצרים api/config.php (לא נכנס ל-git) עם הערכים האמיתיים.
 * ההוראות המלאות ב-DEPLOY.md.
 */
return [
    // קוד המשפחה: סיסמה משותפת שמזינים פעם אחת בכל מכשיר. לפחות 12 תווים, אקראי.
    'key' => 'CHANGE-ME-to-a-long-random-string',

    // איפה נשמרים הנתונים. מומלץ מחוץ לתיקיית האתר, למשל:
    // '/home/u123456789/familypoints-data'
    // אם לא מוגדר: api/data/ (מוגן ב-.htaccess).
    'data_dir' => '/home/USER/familypoints-data',
];
