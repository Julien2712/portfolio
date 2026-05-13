<?php
/**
 * DODGE BALL — Serveur de signaling WebRTC (remplace 0.peerjs.com)
 * À déposer sur o2switch dans /public_html/dodgeball/signal.php
 *
 * Créer la table avec le SQL en commentaire en bas de ce fichier.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'phju4799_dodgball');
define('DB_USER', 'phju4799_dogeball');
define('DB_PASS', 'phju4799_dodgball');
define('MSG_TTL',  30);   // secondes avant qu'un message expire
define('PEER_TTL', 60);   // secondes avant qu'un peer expire (sans heartbeat)
define('POLL_MAX', 8);    // secondes max de long-poll (o2switch limite à ~10s)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(204);exit;}

try {
    $pdo = new PDO(
        "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4",
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]
    );
} catch(Exception $e){
    http_response_code(500); echo json_encode(['error'=>'db']); exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Nettoyage périodique ────────────────────────────────
if(rand(0,20)===0){
    $pdo->exec("DELETE FROM sig_messages WHERE created_at < DATE_SUB(NOW(), INTERVAL ".MSG_TTL." SECOND)");
    $pdo->exec("DELETE FROM sig_peers WHERE last_seen < DATE_SUB(NOW(), INTERVAL ".PEER_TTL." SECOND)");
}

// ══════════════════════════════════════════════════════════
// POST ?action=register  { peerId }
// Enregistre un peer (je suis en ligne avec cet ID)
// ══════════════════════════════════════════════════════════
if($method==='POST' && $action==='register'){
    $b = json_decode(file_get_contents('php://input'),true);
    $id = clean($b['peerId']??'');
    if(!$id){http_response_code(400);echo json_encode(['error'=>'no id']);exit;}
    $pdo->prepare("INSERT INTO sig_peers (peer_id,last_seen) VALUES(?,NOW()) ON DUPLICATE KEY UPDATE last_seen=NOW()")
        ->execute([$id]);
    echo json_encode(['ok'=>true,'peerId'=>$id]);
    exit;
}

// ══════════════════════════════════════════════════════════
// POST ?action=heartbeat  { peerId }
// ══════════════════════════════════════════════════════════
if($method==='POST' && $action==='heartbeat'){
    $b = json_decode(file_get_contents('php://input'),true);
    $id = clean($b['peerId']??'');
    $pdo->prepare("UPDATE sig_peers SET last_seen=NOW() WHERE peer_id=?")->execute([$id]);
    echo json_encode(['ok'=>true]);
    exit;
}

// ══════════════════════════════════════════════════════════
// POST ?action=send  { from, to, type, payload }
// Envoie un message de signaling à un peer
// ══════════════════════════════════════════════════════════
if($method==='POST' && $action==='send'){
    $b = json_decode(file_get_contents('php://input'),true);
    $from    = clean($b['from']??'');
    $to      = clean($b['to']??'');
    $type    = clean($b['type']??'');          // offer|answer|candidate|leave
    $payload = json_encode($b['payload']??null);
    if(!$from||!$to||!$type){http_response_code(400);echo json_encode(['error'=>'missing']);exit;}
    $pdo->prepare("INSERT INTO sig_messages(from_peer,to_peer,type,payload,created_at) VALUES(?,?,?,?,NOW())")
        ->execute([$from,$to,$type,$payload]);
    echo json_encode(['ok'=>true]);
    exit;
}

// ══════════════════════════════════════════════════════════
// GET ?action=poll&peerId=XXX[&lastId=0]
// Long-poll : attend jusqu'à POLL_MAX secondes pour des messages
// ══════════════════════════════════════════════════════════
if($method==='GET' && $action==='poll'){
    $peerId = clean($_GET['peerId']??'');
    $lastId = intval($_GET['lastId']??0);
    if(!$peerId){http_response_code(400);echo json_encode(['error'=>'no id']);exit;}

    // Heartbeat implicite
    $pdo->prepare("UPDATE sig_peers SET last_seen=NOW() WHERE peer_id=?")->execute([$peerId]);

    $start = time();
    while(true){
        $stmt = $pdo->prepare("SELECT id,from_peer,type,payload FROM sig_messages WHERE to_peer=? AND id>? ORDER BY id ASC LIMIT 20");
        $stmt->execute([$peerId,$lastId]);
        $rows = $stmt->fetchAll();
        if($rows){
            $last = end($rows);
            // Supprimer les messages récupérés
            $ids = implode(',', array_map(fn($r)=>intval($r['id']), $rows));
            $pdo->exec("DELETE FROM sig_messages WHERE id IN($ids)");
            $out = array_map(fn($r)=>[
                'id'      => intval($r['id']),
                'from'    => $r['from_peer'],
                'type'    => $r['type'],
                'payload' => json_decode($r['payload'],true)
            ], $rows);
            echo json_encode(['messages'=>$out]);
            exit;
        }
        if(time()-$start >= POLL_MAX) break;
        usleep(600000); // 0.6s
    }
    echo json_encode(['messages'=>[]]);
    exit;
}

// ══════════════════════════════════════════════════════════
// GET ?action=exists&peerId=XXX
// Vérifie si un peer est en ligne
// ══════════════════════════════════════════════════════════
if($method==='GET' && $action==='exists'){
    $id = clean($_GET['peerId']??'');
    $stmt = $pdo->prepare("SELECT 1 FROM sig_peers WHERE peer_id=? AND last_seen > DATE_SUB(NOW(), INTERVAL ".PEER_TTL." SECOND)");
    $stmt->execute([$id]);
    echo json_encode(['exists'=>(bool)$stmt->fetch()]);
    exit;
}

http_response_code(404); echo json_encode(['error'=>'not found']);

function clean($s){ return substr(preg_replace('/[^A-Za-z0-9\-_]/','',$s),0,40); }

/*
══════════════════════════════════════════════════════════
  SQL à exécuter dans phpMyAdmin (base phju4799_dodgball)
══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sig_peers (
    peer_id   VARCHAR(40) NOT NULL PRIMARY KEY,
    last_seen DATETIME    NOT NULL,
    INDEX idx_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sig_messages (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_peer  VARCHAR(40)  NOT NULL,
    to_peer    VARCHAR(40)  NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    payload    TEXT,
    created_at DATETIME     NOT NULL,
    INDEX idx_to (to_peer, id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

══════════════════════════════════════════════════════════
*/
