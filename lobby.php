<?php
/**
 * DODGE BALL — Lobby API
 */
define('DB_HOST', 'localhost');
define('DB_NAME', 'phju4799_dodgball');
define('DB_USER', 'phju4799_dogeball');
define('DB_PASS', 'phju4799_dodgball');
define('ROOM_TTL', 60); // 60s — rooms expirées nettoyées rapidement

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

try {
    $pdo = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4", DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
} catch (Exception $e) { http_response_code(500); echo json_encode(['error'=>'DB connection failed']); exit; }

// Nettoyage rooms expirées (chaque requête)
$pdo->exec("DELETE FROM rooms WHERE updated_at < DATE_SUB(NOW(), INTERVAL ".ROOM_TTL." SECOND)");

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method==='GET' && $action==='list') {
    $mode = $_GET['mode'] ?? null;
    if ($mode && in_array($mode,['wolf','bomb'])) {
        $stmt=$pdo->prepare("SELECT code,mode,players,max_players FROM rooms WHERE mode=? ORDER BY updated_at DESC"); $stmt->execute([$mode]);
    } else { $stmt=$pdo->query("SELECT code,mode,players,max_players FROM rooms ORDER BY updated_at DESC"); }
    echo json_encode(['rooms'=>$stmt->fetchAll()]); exit;
}

if ($method==='POST' && $action==='publish') {
    $body=json_decode(file_get_contents('php://input'),true);
    $code=substr(preg_replace('/[^A-Z0-9\-]/','',strtoupper($body['code']??'')),0,20);
    $mode=in_array($body['mode']??'',['wolf','bomb'])?$body['mode']:null;
    $players=max(1,min(4,intval($body['players']??1)));
    $maxPlayers=max(2,min(4,intval($body['maxPlayers']??3)));
    if (!$code||!$mode){http_response_code(400);echo json_encode(['error'=>'invalid']);exit;}
    $pdo->prepare("INSERT INTO rooms(code,mode,players,max_players,updated_at) VALUES(?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE players=VALUES(players),max_players=VALUES(max_players),updated_at=NOW()")->execute([$code,$mode,$players,$maxPlayers]);
    echo json_encode(['ok'=>true]); exit;
}

// remove_post accepte aussi le code en GET param (sendBeacon compatibilité)
if (($method==='POST' && $action==='remove_post') || ($method==='GET' && $action==='remove_post')) {
    $body=json_decode(file_get_contents('php://input'),true);
    $code=substr(preg_replace('/[^A-Z0-9\-]/','',strtoupper($body['code']??$_GET['code']??'')),0,20);
    if ($code) $pdo->prepare("DELETE FROM rooms WHERE code=?")->execute([$code]);
    echo json_encode(['ok'=>true]); exit;
}

if ($method==='DELETE' && $action==='remove') {
    $code=substr(preg_replace('/[^A-Z0-9\-]/','',strtoupper($_GET['code']??'')),0,20);
    if (!$code){http_response_code(400);echo json_encode(['error'=>'invalid']);exit;}
    $pdo->prepare("DELETE FROM rooms WHERE code=?")->execute([$code]);
    echo json_encode(['ok'=>true]); exit;
}

if ($method==='POST' && $action==='heartbeat') {
    $body=json_decode(file_get_contents('php://input'),true);
    $code=substr(preg_replace('/[^A-Z0-9\-]/','',strtoupper($body['code']??'')),0,20);
    if (!$code){http_response_code(400);echo json_encode(['error'=>'invalid']);exit;}
    $pdo->prepare("UPDATE rooms SET updated_at=NOW() WHERE code=?")->execute([$code]);
    echo json_encode(['ok'=>true]); exit;
}

// ── CHAT GLOBAL (stockage fichier JSON) ──────────────────────────────────
define('CHAT_FILE', __DIR__ . '/chat_data.json');
define('CHAT_MAX',  80);
define('CHAT_TTL',  3600);

function chatRead() {
    if (!file_exists(CHAT_FILE)) return ['messages'=>[], 'nextId'=>1];
    $raw = @file_get_contents(CHAT_FILE);
    if (!$raw) return ['messages'=>[], 'nextId'=>1];
    $d = json_decode($raw, true);
    return is_array($d) ? $d : ['messages'=>[], 'nextId'=>1];
}
function chatWrite($data) { file_put_contents(CHAT_FILE, json_encode($data), LOCK_EX); }
function chatClean(&$data) {
    $cutoff = time() - CHAT_TTL;
    $data['messages'] = array_values(array_filter($data['messages'], fn($m) => ($m['ts'] ?? 0) >= $cutoff));
    if (count($data['messages']) > CHAT_MAX) $data['messages'] = array_slice($data['messages'], -CHAT_MAX);
}

if ($method==='POST' && $action==='chat_send') {
    $body = json_decode(file_get_contents('php://input'), true);
    $pseudo  = mb_substr(strip_tags($body['pseudo']  ?? 'Anonyme'), 0, 20);
    $message = mb_substr(strip_tags($body['message'] ?? ''), 0, 200);
    if (!$message) { http_response_code(400); echo json_encode(['error'=>'empty']); exit; }
    $data = chatRead(); chatClean($data);
    $now = new DateTime('now', new DateTimeZone('Europe/Paris'));
    $data['messages'][] = ['id'=>$data['nextId']++,'pseudo'=>$pseudo,'message'=>$message,'time'=>$now->format('H:i'),'ts'=>time()];
    chatWrite($data);
    echo json_encode(['ok'=>true]); exit;
}

if ($method==='GET' && $action==='chat_poll') {
    $since = intval($_GET['since'] ?? 0);
    $data  = chatRead();
    $msgs  = array_values(array_filter($data['messages'], fn($m) => ($m['id'] ?? 0) > $since));
    $msgs  = array_map(fn($m) => ['id'=>$m['id'],'pseudo'=>$m['pseudo'],'message'=>$m['message'],'time'=>$m['time']], $msgs);
    echo json_encode(['messages'=>array_values($msgs)]); exit;
}

http_response_code(404); echo json_encode(['error'=>'not found']);