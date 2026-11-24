<?php
// ship.php — books a shipment on InstaWorld Merchant API v2.
// The API key lives ONLY on the server, in ship-config.php (never in the website JS).

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$config = @include __DIR__ . '/ship-config.php';
$apiKey = is_array($config) ? ($config['api_key'] ?? '') : '';
$locationId = is_array($config) ? (int)($config['location_id'] ?? 0) : 0;
if (!$apiKey) {
    echo json_encode(['success' => false, 'error' => 'ship-config.php missing or has no api_key']);
    exit;
}

$b = json_decode(file_get_contents('php://input'), true) ?: [];

$fullName = trim($b['customer_name'] ?? 'Customer') ?: 'Customer';
$parts = preg_split('/\s+/', $fullName);
$firstName = array_shift($parts) ?: 'Customer';
$lastName = implode(' ', $parts) ?: null;

$phone = preg_replace('/\D/', '', (string)($b['customer_phone'] ?? ''));
if (strlen($phone) === 12 && strpos($phone, '92') === 0) $phone = '0' . substr($phone, 2);

$city = strtoupper(trim((string)($b['customer_city'] ?? '')));
$address = trim((string)($b['customer_address'] ?? '')) ?: $city;
$amount = (float)($b['cod_amount'] ?? 0);
$orderId = trim((string)($b['order_id'] ?? '')) ?: ('ZO' . time());
$email = filter_var($b['customer_email'] ?? '', FILTER_VALIDATE_EMAIL) ?: null;

$items = [];
foreach (($b['items'] ?? []) as $i) {
    $items[] = [
        'title' => (string)($i['name'] ?? 'Zee Organic Product'),
        'sku' => (string)($i['id'] ?? ''),
        'quantity' => max(1, (float)($i['qty'] ?? 1)),
        'price' => (float)($i['price'] ?? 0),
        'kg' => 0.5,
    ];
}
if (!$items) $items[] = ['title' => 'Zee Organic Product', 'quantity' => 1, 'price' => $amount, 'kg' => 0.5];

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
$curlErr = curl_error($ch);
curl_close($ch);

if ($raw === false) {
    echo json_encode(['success' => false, 'error' => 'Could not reach InstaWorld: ' . $curlErr]);
    exit;
}

$data = json_decode($raw, true);
$tracking = $data['data']['tracking_number'] ?? null;

if ($status >= 200 && $status < 300 && $tracking) {
    echo json_encode(['success' => true, 'tracking_number' => $tracking]);
} else {
    echo json_encode([
        'success' => false,
        'http_status' => $status,
        'error' => $data['error']['code'] ?? 'unknown_error',
        'message' => $data['error']['message'] ?? substr((string)$raw, 0, 300),
        'details' => $data['error']['details'] ?? [],
        'request_id' => $data['error']['request_id'] ?? null,
    ]);
}
