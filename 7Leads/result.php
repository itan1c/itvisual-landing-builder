<?php
include('_config.php');

/* ВАШИ НАСТРОЙКИ КОДА */
$order = [
    // Обязательные параметры
    'key' => $key, // Ваш API-ключ
    'name' => $_POST['name'], // Имя клиента из формы заказа
    'phone' => $_POST['phone'], // Телефон клиента из формы заказа
    'country' => $country, // Код страны (в формате двух символов)
    'offer_id' => $offer_id, // ID оффера
    'products' => $products, // ID субоффера
    'sale' => $sale, // Скидка

    // Обязательно только для DROP и TEAM платформ
    'price' => $price, // Цена

    // Обязательно только для TEAM платформы
    'domain' => $_SERVER['HTTP_HOST'], // идентификатов потока (домен или ссылка лендинга)

    // Необязательные параметры
    'sub1' => $_POST['sub1'] ?? null,
    'add_params' => $_POST['add_params'] ?? null, // Массив, доп. параметры заказа: ['color' => 'red', 'size' => 'xl'...]
];

/* НЕ МЕНЯТЬ ЭТУ ЧАСТЬ КОДА */
$order = array_merge($_GET, $order);
$order['uniqid'] = uniqid();
$order['ip'] = $_SERVER['REMOTE_ADDR'];
$order['time_vizit'] = $_SESSION['time_vizit'];
$order['url_vizit'] = $_SESSION['url_vizit'];
$order['referrer'] = $_SESSION['referrer'];
$postfields = http_build_query($order);

// Отправка заказа в систему
try {
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, 'https://crm.7leads.xyz/api/order');
    curl_setopt($curl, CURLOPT_POST, true);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_POSTFIELDS, $postfields);
    $out = curl_exec($curl);
    curl_close($curl);
    $order['result_str'] = $out;
    $arr = json_decode($out, true);
    $order['error'] = $arr['error'];
    $order['order_id'] = (!empty($arr['order_id'])) ? $arr['order_id'] : 0;
} catch (\Exception $e) {
}

// Отправка заказа в бекап
try {
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, 'https://connect.wowsale.info/backup.php');
    curl_setopt($curl, CURLOPT_POST, true);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_POSTFIELDS, $postfields);
    $out = curl_exec($curl);
    curl_close($curl);
} catch (\Exception $e) {
}
?>
<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.6.0/css/bootstrap.min.css" rel="stylesheet">
    <title>Ваш заказ принят!</title>
    <meta name="description" content="Ваш заказ принят!">
</head>
<body>
    <div class="container">
        <div class="row">
            <div class="col">
                <div class="jumbotron">
                    <h1 class="display-4">Спасибо за Ваш заказ, <?php echo $order['name']; ?>!</h1>
                    <p class="lead">Наши менеджеры свяжутся с Вами в ближайшее время по телефону <?php echo $order['phone']; ?></p>
                    <hr class="my-4">
                    <p class="lead">
                        <a class="btn btn-primary btn-lg" href="<?php echo $_SERVER['HTTP_REFERER']; ?>" role="button">На главную</a>
                    </p>
                </div>
            </div>
        </div>
    </div>
    <script src="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.6.0/js/bootstrap.bundle.min.js"></script>
    <script>
        // Facebook Pixel
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '<?= $_REQUEST[pixel] ?? "";?>');fbq('track', 'PageView');fbq('track', 'Lead');
        document.querySelectorAll('.btn-popup.dop').forEach(function(button) {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelector('.popup').style.display = 'block';
                document.querySelector('.overlay').style.cssText = 'display: block;width: 100%;height: 100%;position: fixed;top: 0;left: 0;right: 0;bottom: 0;background: rgba(0, 0, 0, .7);z-index:3;';
            });
        });
        document.querySelector('.close').addEventListener('click', function() {
            document.querySelector('.popup').style.display = 'none';
            document.querySelector('.overlay').style.display = 'none';
        });
    </script>
</body>
</html>
