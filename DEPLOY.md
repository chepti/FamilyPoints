# פריסה והגדרת סנכרון: נקודות משפחה

האפליקציה היא אתר סטטי (HTML/CSS/JS, בלי build) ושרת סנכרון קטן ב-PHP (`api/index.php`).
הכתובת: https://chepti.com/family/

**הריפו ציבורי.** אסור להכניס אליו שום סוד או פרט חשבון (מפתחות, סיסמאות, שמות משתמש, נתיבי שרת).
מה שייחודי לחשבון מוגדר רק ב-GitHub Secrets ובשרת.

## איך זה עובד

| רכיב | איפה | הערה |
|---|---|---|
| קבצי האתר | `public_html/family/` בשרת | נפרסים אוטומטית מ-GitHub Actions בכל push ל-`main` |
| `api/config.php` | `public_html/family/api/` בשרת בלבד | קוד המשפחה ומיקום הנתונים. **לא ב-git, לא נדרס בפריסה** |
| הנתונים (`family.json`) | תיקייה **מחוץ** ל-`public_html` בשרת | הפריסה לא נוגעת בה |
| סודות פריסה | GitHub → Settings → Secrets → Actions | ראו למטה |

הפריסה מעלה רשימה סגורה של קבצים, לא מוחקת כלום בשרת, ולא נוגעת בתיקיות אחרות
(`talap`, `wilk` וכו׳). היא מסרבת לרוץ אם `DEPLOY_PATH` לא מסתיים ב-`/family`.

## הוראות לקלוד קוד מקומי (שיש לו SSH להוסטינגר)

> קראו את כל הסעיף לפני שמתחילים. אם משהו לא ברור או שונה ממה שכתוב כאן, עצרו ושאלו את המשתמשת.

### כללי ברזל
1. **לא מדפיסים ולא שומרים סודות בצ'אט, בלוג, בקומיט או בקובץ בתוך הריפו.** ערכים עוברים רק דרך stdin או קבצים זמניים מחוץ לריפו.
2. לא נוגעים בשום דבר ב-`public_html` מחוץ ל-`family/`. אסור למחוק או לשנות את `talap`, `wilk` וכל אתר אחר.
3. אין `rsync --delete`, אין `rm -rf` על תיקיות באתר.
4. פרטי החיבור (alias, פורט, משתמש, נתיב הבית) לוקחים מה-`CLAUDE.md` שלכם ומקובץ ה-SSH config. הם לא כתובים כאן בכוונה.

### שלב 0: הכנה
- שכפלו או עדכנו: `git clone https://github.com/chepti/FamilyPoints` (או `git pull`).
- ודאו ש-`gh auth status` תקין ושיש הרשאה לכתוב סודות ל-`chepti/FamilyPoints`.
- ודאו שהחיבור ל-SSH עובד, וגלו: משתמש, host, פורט, ונתיב הבית (`echo $HOME` בשרת).
  נתיב האתר הוא `$HOME/public_html` (דומיין ראשי), ותיקיית היעד `$HOME/public_html/family`.

### שלב 1: קוד משפחה ושרת הסנכרון
1. צרו קוד משפחה אקראי (לא מדפיסים אותו בצ'אט):
   `node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"`
   שמרו אותו בקובץ מקומי **מחוץ לריפו**, למשל `~/familypoints-family-key.txt` עם הרשאות קריאה לבעלים בלבד.
   המשתמשת תקרא אותו משם ותזין אותו בטלפונים.
2. בשרת, דרך SSH:
   - צרו תיקיית נתונים מחוץ לאתר: `$HOME/familypoints-data` (הרשאות 750).
   - צרו `$HOME/public_html/family/api/config.php` (הרשאות 600) עם התוכן:
     ```php
     <?php
     return ['key' => '<הקוד>', 'data_dir' => '<נתיב הבית>/familypoints-data'];
     ```
     את הקוד מעבירים ב-stdin (למשל `... | ssh host 'cat > .../config.php'`), לא כארגומנט בשורת הפקודה.
   - (תיקיית `api/` נוצרת גם בפריסה הראשונה. אם היא עוד לא קיימת, צרו אותה עם `mkdir -p`.)

### שלב 2: מפתח פריסה ל-GitHub Actions
1. צרו זוג מפתחות ייעודי **בתיקייה זמנית מחוץ לריפו**:
   `ssh-keygen -t ed25519 -N "" -C "familypoints-deploy" -f <tmp>/deploy_key`
2. הוסיפו את המפתח **הציבורי** לשורה חדשה ב-`~/.ssh/authorized_keys` בשרת (הוספה בלבד, לא מחליפים את הקובץ).
   ההערה `familypoints-deploy` מאפשרת לבטל את המפתח בעתיד: מוחקים את השורה הזו.
3. אספו את מפתח השרת לצורך הצמדה: `ssh-keyscan -p <פורט> <host>` (הפלט הוא `DEPLOY_KNOWN_HOSTS`).

### שלב 3: סודות ב-GitHub
הגדירו עם `gh secret set <שם> --repo chepti/FamilyPoints` כשהערך נקרא מ-stdin או מקובץ (`< קובץ`), לא כארגומנט:

| שם הסוד | ערך |
|---|---|
| `DEPLOY_SSH_KEY` | המפתח **הפרטי** שנוצר בשלב 2 |
| `DEPLOY_HOST` | כתובת שרת ה-SSH |
| `DEPLOY_PORT` | פורט ה-SSH |
| `DEPLOY_USER` | משתמש ה-SSH |
| `DEPLOY_PATH` | הנתיב המלא של התיקייה, חייב להסתיים ב-`/family` |
| `DEPLOY_KNOWN_HOSTS` | הפלט של `ssh-keyscan` משלב 2 |

אחרי שהסודות נקלטו, **מחקו את המפתח הפרטי מהדיסק** (`shred -u` או מחיקה רגילה). לא משאירים עותק.

### שלב 4: הרצה ואימות
1. הריצו: `gh workflow run deploy.yml --repo chepti/FamilyPoints` ואז `gh run watch` עד שהוא ירוק.
   (ה-workflow מכיל smoke test משלו.)
2. אמתו בעצמכם:
   - `curl -sI https://chepti.com/family/` מחזיר 200, וכך גם `js/app.js`, `js/sync.js`, `css/style.css`, `manifest.webmanifest`.
   - הקובץ `manifest.webmanifest` מוגש עם `Content-Type: application/manifest+json`.
   - `curl -s -X POST "https://chepti.com/family/api/index.php?action=ping"` מחזיר `"configured":true,"auth":false`.
   - אותה בקשה עם הכותרת `X-Key: <הקוד>` (קראו אותו מהקובץ, בלי להדפיס) מחזירה `"auth":true`.
   - `https://chepti.com/family/api/config.php` **לא** מחזיר תוכן (403/404/ריק), ואין גישה ל-`family.json` מהרשת.
   - `https://chepti.com/talap/` ו-`https://chepti.com/wilk/` עדיין מחזירים 200.
3. דווחו למשתמשת: אילו סודות הוגדרו (שמות בלבד), איפה נשמר קובץ קוד המשפחה, ותוצאות האימות.

### אם משהו נכשל
- `Permission denied (publickey)` ב-Actions: המפתח הציבורי לא נוסף ל-`authorized_keys`, או הפורט/המשתמש שגויים.
- `Host key verification failed`: `DEPLOY_KNOWN_HOSTS` לא תואם לשרת. הריצו שוב `ssh-keyscan -p <פורט>`.
- Actions לא מצליח להתחבר בכלל (חסימת IP בצד Hostinger): אל תנסו לעקוף. חזרו למשתמשת. אפשר לפרוס ידנית עם `scp` של אותה רשימת קבצים, כמו בפריסה הראשונה.
- הרשאות: תיקיות 755 וקבצים 644 (חוץ מ-`config.php` שהוא 600). `scp` יוצר תיקיות 700, ואז השרת מחזיר 404.

## פריסה ידנית (גיבוי)
לפני ההעלאה מחליפים ב-`index.html` את `?v=dev` בערך חדש (למשל תאריך ושעה), אחרת ה-CDN של Hostinger ימשיך להגיש גרסאות ישנות של JS/CSS:
`sed -i "s/?v=dev/?v=$(date +%Y%m%d%H%M)/g" index.html` (על עותק זמני, לא להכניס לריפו).
מעלים את הקבצים האלה ל-`public_html/family/` ומתקנים הרשאות (תיקיות 755, קבצים 644):
`index.html`, `sw.js`, `manifest.webmanifest`, `.htaccess`, `css/`, `js/`, `icons/`, `api/index.php`, `api/config.sample.php`, `api/.htaccess`.
**לא** מעלים: `.git`, `.github`, `*.md`, `api/config.php` (קיים רק בשרת).

## למה יש `?v=` ו-`no-cache`
בלי הגדרה, Hostinger מוסיף לקבצי JS/CSS `Cache-Control: public, max-age=604800` (שבוע). ה-CDN שלהם והדפדפנים של המשפחה שומרים עותק ישן,
ואחרי עדכון מתקבל `index.html` חדש יחד עם `app.js` ישן (למשל בלי הסנכרון). הפתרון: `.htaccess` מבקש בדיקה מחדש בכל טעינה (`no-cache`, תשובת 304 זולה),
וה-workflow מחתים את כתובות הקבצים ב-SHA. ה-smoke test מוודא שהקבצים שהאתר מגיש בפועל (דרך ה-CDN) זהים לריפו.

## שינוי או החלפה של קוד המשפחה
מעדכנים את `key` ב-`api/config.php` בשרת. כל המכשירים יציגו "קוד שגוי" ויצטרכו להתחבר מחדש
(הורים ← הגדרות ← סנכרון). הנתונים עצמם לא נפגעים.

## איך הסנכרון עובד (בקצרה)
- כל רשומה (בן משפחה, משימה, דיווח, הגדרות) נשלחת בנפרד. מכשיר שולח רק את מה ששינה.
- המכשיר שואל את השרת "מה השתנה מאז גרסה X" כל 10 שניות, וגם בחזרה לאפליקציה ובחזרת חיבור.
- אין חיבור? העבודה ממשיכה מקומית, והשינויים נשלחים כשהחיבור חוזר.
- התנגשות באותה רשומה: האחרון שהגיע לשרת מנצח.
- **מגבלה:** אין אכיפה בשרת של "פעם ביום". אם שני מכשירים מסמנים את אותה משימה באותה שנייה, היא תירשם פעמיים. הורה יכול למחוק אחת מהאישורים.
