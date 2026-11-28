<?php
// ship.php — books a shipment on InstaWorld Merchant API v2 for one saved order.
// The API key lives ONLY on the server, in ship-config.php (never in the website JS).
//
// Security:
//  - The caller must send their Firebase sign-in token. We read the order from
//    Firestore WITH that token, so Firestore rules prove the order is theirs.
//  - Customer details, items and prices come from Firestore, not from the request.
//  - Prices are re-checked against the live catalog; a tampered total is refused.

const FIREBASE_PROJECT = 'zee-organic';
const ALLOWED_ORIGINS = [
    'https://zeeorganicstore.com',
    'https://www.zeeorganicstore.com',
    'http://localhost:5173',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

function reply($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') reply(200, []);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405, ['success' => false, 'error' => 'Method not allowed']);
if ($origin !== '' && !in_array($origin, ALLOWED_ORIGINS, true)) reply(403, ['success' => false, 'error' => 'forbidden']);

$config = @include __DIR__ . '/ship-config.php';
$apiKey = is_array($config) ? ($config['api_key'] ?? '') : '';
$locationId = is_array($config) ? (int)($config['location_id'] ?? 0) : 0;
$shippingFee = is_array($config) && isset($config['shipping_fee']) ? (float)$config['shipping_fee'] : 250.0;
if (!$apiKey) reply(500, ['success' => false, 'error' => 'server_config']);

$b = json_decode(file_get_contents('php://input'), true) ?: [];
$idToken = (string)($b['id_token'] ?? '');
$orderId = (string)($b['order_id'] ?? '');
if ($idToken === '' || !preg_match('/^[A-Za-z0-9]{10,40}$/', $orderId)) {
    reply(400, ['success' => false, 'error' => 'bad_request']);
}

// ---- Firestore REST helpers ----
function firestore_get($path, $idToken = null) {
    $url = 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT
         . '/databases/(default)/documents/' . $path;
    $headers = ['Accept: application/json'];
    if ($idToken) $headers[] = 'Authorization: Bearer ' . $idToken;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => $headers,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $status !== 200) return [null, $status];
    $doc = json_decode($raw, true);
    return [fs_fields($doc['fields'] ?? []), $status];
}

function fs_value($v) {
    if (array_key_exists('stringValue', $v)) return $v['stringValue'];
    if (array_key_exists('integerValue', $v)) return (int)$v['integerValue'];
    if (array_key_exists('doubleValue', $v)) return (float)$v['doubleValue'];
    if (array_key_exists('booleanValue', $v)) return (bool)$v['booleanValue'];
    if (array_key_exists('nullValue', $v)) return null;
    if (array_key_exists('timestampValue', $v)) return $v['timestampValue'];
    if (array_key_exists('mapValue', $v)) return fs_fields($v['mapValue']['fields'] ?? []);
    if (array_key_exists('arrayValue', $v)) return array_map('fs_value', $v['arrayValue']['values'] ?? []);
    return null;
}

function fs_fields($fields) {
    $out = [];
    foreach ($fields as $k => $v) $out[$k] = fs_value($v);
    return $out;
}

// ---- 1. Load the order as the signed-in customer (rules enforce ownership) ----
[$order, $status] = firestore_get('orders/' . $orderId, $idToken);
if (!$order) {
    reply($status === 401 || $status === 403 ? 403 : 404, ['success' => false, 'error' => 'order_not_found']);
}
if (($order['status'] ?? '') !== 'pending') reply(409, ['success' => false, 'error' => 'order_not_pending']);
if (!empty($order['instaTracking'])) {
    reply(200, ['success' => true, 'tracking_number' => $order['instaTracking']]);
}

// ---- 2. Re-price the items from the live catalog ----
[$catalog] = firestore_get('storefront/catalog');
$priceById = [];
foreach (($catalog['products'] ?? []) as $p) {
    if (isset($p['id'], $p['p'])) $priceById[(string)$p['id']] = ['price' => (float)$p['p'], 'name' => (string)($p['n'] ?? '')];
}
if (!$priceById) reply(503, ['success' => false, 'error' => 'catalog_unavailable']);

$items = [];
$subtotal = 0.0;
foreach (($order['items'] ?? []) as $i) {
    $id = (string)($i['id'] ?? '');
    $qty = (int)($i['qty'] ?? 0);
    if (!isset($priceById[$id]) || $qty < 1 || $qty > 100) {
        reply(422, ['success' => false, 'error' => 'invalid_item']);
    }
    $price = $priceById[$id]['price'];
    $subtotal += $price * $qty;
    $items[] = [
        'title' => $priceById[$id]['name'] ?: 'Zee Organic Product',
        'sku' => $id,
        'quantity' => $qty,
        'price' => $price,
        'kg' => 0.5,
    ];
}
if (!$items) reply(422, ['success' => false, 'error' => 'invalid_item']);

$amount = $subtotal + $shippingFee;
if (abs($amount - (float)($order['total'] ?? -1)) > 0.01) {
    reply(422, ['success' => false, 'error' => 'price_mismatch']);
}

// ---- 3. Build the consignee from the saved order ----
$addr = is_array($order['address'] ?? null) ? $order['address'] : [];
$fullName = trim((string)($order['customerName'] ?? '')) ?: 'Customer';
$parts = preg_split('/\s+/', $fullName);
$firstName = array_shift($parts) ?: 'Customer';
$lastName = implode(' ', $parts) ?: null;

$phone = preg_replace('/\D/', '', (string)($order['phone'] ?? ''));
if (strlen($phone) === 12 && strpos($phone, '92') === 0) $phone = '0' . substr($phone, 2);

$city = trim((string)($addr['city'] ?? ''));
$address = implode(', ', array_filter(array_map('trim', [
    (string)($addr['building'] ?? ''),
    (string)($addr['area'] ?? ''),
    (string)($addr['locality'] ?? ''),
    (string)($addr['address'] ?? ''),
    $city,
    (string)($addr['province'] ?? ''),
]))) ?: $city;
$email = filter_var($order['email'] ?? '', FILTER_VALIDATE_EMAIL) ?: null;

$payload = [
    'location_id' => $locationId ?: null,
    'ref_no' => $orderId,
    'payment' => ['type' => 'cod', 'amount' => $amount],
    'consignee' => [
        'first_name' => $firstName,
        'last_name' => $lastName,
        'phone' => $phone,
        'email' => $email,
        'address' => mb_substr($address, 0, 200),
        'city' => $city,
    ],
    'items' => $items,
    'remarks' => 'Zee Organic order ' . $orderId,
];

// ---- 4. Book the shipment (Idempotency-Key stops double booking) ----
$ch = curl_init('https://one-be.instaworld.pk/merchant-api/v2/shipments');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 45,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer ' . $apiKey,
        'Idempotency-Key: ' . $orderId,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
]);
$raw = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($raw === false) reply(502, ['success' => false, 'error' => 'courier_unreachable']);

$data = json_decode($raw, true);
$tracking = $data['data']['tracking_number'] ?? null;

if ($status >= 200 && $status < 300 && $tracking) {
    reply(200, ['success' => true, 'tracking_number' => $tracking]);
}

// Full courier details go to the server log only, not to the browser.
error_log('InstaWorld booking failed for ' . $orderId . ' (HTTP ' . $status . '): ' . substr((string)$raw, 0, 1000));
reply(502, [
    'success' => false,
    'error' => $data['error']['code'] ?? 'courier_error',
    'message' => $data['error']['message'] ?? '',
]);
