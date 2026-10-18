<?php
/*
 * שרת הסנכרון של "נקודות משפחה".
 * נקודת כניסה אחת: POST api/index.php?action=ping|sync
 *
 * ההגדרות (קוד המשפחה ומיקום הנתונים) נמצאות ב-api/config.php בשרת בלבד.
 * הקובץ לא נמצא ב-git. ראו config.sample.php ו-DEPLOY.md.
 *
 * מודל הנתונים: אוסף רשומות {t, id, d, rev} או מצבת מחיקה {t, id, del, rev}.
 * כל כתיבה מקבלת rev עולה, והלקוח מבקש "כל מה שהשתנה מאז rev X".
 * במקרה של התנגשות, הכתיבה המאוחרת (לפי סדר הגעה לשרת) מנצחת.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out($code, $body)
{
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

const RECORD_TYPES = ['member', 'task', 'completion', 'settings'];
const MAX_BODY = 2000000;
const MAX_CHANGES = 5000;
const MAX_RECORD = 20000;

$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) {
    out(200, ['ok' => true, 'configured' => false]);
}
$cfg = require $cfgFile;
$key = is_array($cfg) ? (string)($cfg['key'] ?? '') : '';
if (strlen($key) < 12) {
    out(200, ['ok' => true, 'configured' => false]);
}
$dataDir = rtrim((string)($cfg['data_dir'] ?? (__DIR__ . '/data')), '/\\');

$given = isset($_SERVER['HTTP_X_KEY']) ? (string)$_SERVER['HTTP_X_KEY'] : '';
$authed = $given !== '' && hash_equals($key, $given);
if ($given !== '' && !$authed) {
    usleep(600000); // מאט ניחושים
}

$action = isset($_GET['action']) ? (string)$_GET['action'] : '';

if ($action === 'ping') {
    out(200, ['ok' => true, 'configured' => true, 'auth' => $authed]);
}

if ($action !== 'sync') {
    out(404, ['ok' => false, 'error' => 'unknown_action']);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out(405, ['ok' => false, 'error' => 'post_only']);
}
if (!$authed) {
    out(401, ['ok' => false, 'error' => 'bad_key']);
}

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if ($raw === false || strlen($raw) > MAX_BODY) {
    out(413, ['ok' => false, 'error' => 'too_large']);
}
$req = json_decode($raw, true);
if (!is_array($req)) {
    out(400, ['ok' => false, 'error' => 'bad_json']);
}
$since = (int)($req['since'] ?? 0);
$changes = $req['changes'] ?? [];
if (!is_array($changes) || count($changes) > MAX_CHANGES) {
    out(400, ['ok' => false, 'error' => 'bad_changes']);
}

if (!is_dir($dataDir) && !@mkdir($dataDir, 0750, true)) {
    out(500, ['ok' => false, 'error' => 'data_dir_unwritable']);
}
$htaccess = $dataDir . '/.htaccess';
if (!is_file($htaccess)) {
    // אם התיקייה בתוך האתר, חוסם גישה ישירה. אם היא מחוץ לאתר, לא מזיק.
    @file_put_contents(
        $htaccess,
        "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n" .
        "<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n"
    );
}

$lock = fopen($dataDir . '/.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) {
    out(500, ['ok' => false, 'error' => 'lock_failed']);
}

$file = $dataDir . '/family.json';
$db = null;
if (is_file($file)) {
    $db = json_decode((string)file_get_contents($file), true);
}
if (!is_array($db) || !isset($db['rev'], $db['recs']) || !is_array($db['recs'])) {
    $db = ['rev' => 0, 'recs' => []];
}

$acks = [];
$wrote = false;
foreach ($changes as $ch) {
    if (!is_array($ch)) continue;
    $t = isset($ch['t']) ? $ch['t'] : '';
    $id = isset($ch['id']) ? $ch['id'] : '';
    if (!in_array($t, RECORD_TYPES, true) || !is_string($id) || !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) {
        continue;
    }
    if (!empty($ch['del'])) {
        $rec = ['t' => $t, 'id' => $id, 'del' => 1];
    } else {
        $d = isset($ch['d']) ? $ch['d'] : null;
        if (!is_array($d) || strlen((string)json_encode($d)) > MAX_RECORD) continue;
        $rec = ['t' => $t, 'id' => $id, 'd' => $d];
    }
    $db['rev']++;
    $rec['rev'] = $db['rev'];
    $db['recs'][$t . ':' . $id] = $rec;
    $acks[$t . ':' . $id] = $rec['rev'];
    $wrote = true;
}

if ($wrote) {
    $tmp = $file . '.tmp';
    $json = json_encode($db, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($tmp, $json) === false || !rename($tmp, $file)) {
        out(500, ['ok' => false, 'error' => 'write_failed']);
    }
}

$news = [];
foreach ($db['recs'] as $rec) {
    if ($rec['rev'] > $since) $news[] = $rec;
}
usort($news, function ($a, $b) { return $a['rev'] <=> $b['rev']; });

flock($lock, LOCK_UN);
fclose($lock);

out(200, ['ok' => true, 'rev' => $db['rev'], 'acks' => (object)$acks, 'changes' => $news]);
