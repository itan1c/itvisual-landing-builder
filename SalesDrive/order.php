<?php
session_start();
require_once 'my_conf.php';
header('Content-type: application/json; charset=utf8');

$products = [];
            
$products[0]["id"] = $salesdrive_item_id; // id товара
$products[0]["name"] = $item_name; // название товара
$products[0]["costPerItem"] = $price; // цена
$products[0]["amount"] = 1; // количество
            
$_salesdrive_values = [
    "form" => "eafei_g_CLsBPyeBHWyZV8iT1zgw5hIhFWfUwEM_QlFRyZls8tqz7ndrQ8",
    "getResultData" => "", // Получать данные созданной заявки (0 - не получать, 1 - получать)
    "products" => $products, //Товары/Услуги
    "comment" => "", // Комментарий
    "fName" => $_POST['name'] ?? '', // Имя
    "lName" => "", // Фамилия
    "mName" => "", // Отчество
    "phone" => $_POST['phone'] ?? '', // Телефон
    "email" => "", // Email
    "con_comment" => "", // Комментарий
    // "shipping_address" => "", // Адрес доставки
    // "shipping_method" => "", // Способ доставки
    // "payment_method" => "", // Способ оплаты
    "sajt" => "binom", // Сайт
    // "prodex24source_full" => 'prodex24source_full',
    // "prodex24medium" => 'prodex24medium',
    // "prodex24campaign" => 'prodex24campaign',
    // "prodex24content" => 'prodex24content',
    "prodex24source" => $_POST['utm_source'] ?? '', // utm_source

    // "prodex24source" => $_POST['utm_source'] ?? '',
    "prodex24source"=>isset($_POST["utm_source"])?$_POST["utm_source"]:"",
    // "prodex24medium" => isset($_COOKIE["prodex24medium"])?$_COOKIE["prodex24medium"]:"",
    // "prodex24campaign" => isset($_COOKIE["prodex24campaign"])?$_COOKIE["prodex24campaign"]:"",
    // "prodex24content" => isset($_COOKIE["prodex24content"])?$_COOKIE["prodex24content"]:"",
    "prodex24term" => $_POST['clickid'] ?? '',
    "prodex24page" => isset($_SERVER["HTTP_REFERER"])?$_SERVER["HTTP_REFERER"]:"",
];

$_salesdrive_url = "https://saleswave.salesdrive.me/handler/";
$_salesdrive_ch = curl_init();
curl_setopt($_salesdrive_ch, CURLOPT_URL, $_salesdrive_url);
curl_setopt($_salesdrive_ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($_salesdrive_ch, CURLOPT_HTTPHEADER, array('Content-Type:application/json'));
curl_setopt($_salesdrive_ch, CURLOPT_SAFE_UPLOAD, true);
curl_setopt($_salesdrive_ch, CURLOPT_CONNECTTIMEOUT, 30);
curl_setopt($_salesdrive_ch, CURLOPT_POST, 1);
curl_setopt($_salesdrive_ch, CURLOPT_POSTFIELDS, json_encode($_salesdrive_values));
curl_setopt($_salesdrive_ch, CURLOPT_TIMEOUT, 10);

$_salesdrive_res = curl_exec($_salesdrive_ch);
$_salesdriveerrno = curl_errno($_salesdrive_ch);


$httpCode = curl_getinfo($_salesdrive_ch, CURLINFO_HTTP_CODE);
curl_close($curl);
$_salesdrive_error = 0;

if ($_salesdriveerrno or $_salesdrive_res != "") {
    $_salesdrive_error = 1;
}

if ($_salesdrive_error) {
    echo "<p>Ошибка при отправке заявки! Заявка не отправлена.</p>";
}
else{
    echo "<p>Ваша заявка успешно отправлена.</p>";
} 


// Сбор логов

$logDir = 'log/';
if(!is_dir($logDir)) mkdir($logDir) ;

if ($json === 0) {
        file_put_contents($logDir . 'orders.log', json_encode($_REQUEST, JSON_UNESCAPED_UNICODE)."--error-ead-timeout\n", FILE_APPEND);
} else {
	if ($httpCode === 200 or $httpCode === 201) {
	        file_put_contents($logDir . 'orders.log', json_encode($_REQUEST, JSON_UNESCAPED_UNICODE)."\n", FILE_APPEND);
	} else if ($httpCode === 400 or $httpCode === 401 or $httpCode === 404 or $httpCode === 500 or $httpCode === 503) {
	        file_put_contents($logDir . 'orders.log', json_encode($_REQUEST).'--error:'.$httpCode." \n", FILE_APPEND);
	} else {
	        file_put_contents($logDir . 'orders.log', json_encode($_REQUEST, JSON_UNESCAPED_UNICODE)."--error_unknown\n", FILE_APPEND);
	}
}
// Сбор логов конец

$successUrl = 'success.php?' . http_build_query([
    'phone' => $_POST['phone'] ?? false,
    'name' => $_POST['name'] ?? false,
    'clickid' => $_POST['clickid'] ?? false,
    "utm_source" => $_POST['utm_source'] ?? '',
    'gtag' => $_POST['gtag'] ?? false,
    'price' => $products_list[0]['price'] ?? 0,
    'fbpxid' => $fbpxid,
]);

header('Location: ' . $successUrl);