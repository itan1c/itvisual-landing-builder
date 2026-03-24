<?php session_start();
            // НАСТРОЙКИ ЛЕНДИНГА
            $key = "oJuajrVzW3D5wmz0VnN61qMgZ5IfGQDUUsMD"; // API ключ
            $domain = $_SERVER["HTTP_HOST"]; // Идентификатов потока (домен или ссылка лендинга) 
            $country = "UA"; // Страна
            $offer_id = 2704; // ID оффера        
            $products = 2813; // ID субоффера
            $price = 1490; // Цена
            $currency = "грн."; // Валюта
            $sale = 53; // Скидка (%)
            
            // НАСТРОЙКИ SEO
            $meta["meta_t"] = ""; // META title
            $meta["meta_d"] = ""; // META description
            $meta["meta_h1"] = ""; // H1
            
            // ДАННЫЕ ФУТЕРА
            $footer["company"] = ""; // Название компании
            $footer["address"] = ""; // Адрес компании
            $footer["phone"] = ""; // Телефон компании

            // !!! КОД НИЖЕ - НЕ МЕНЯТЬ !!!
            $uid = "";
            $addit = "";
            $office = "";
            $deliv = "";
            $pay = "";
            $landing_price = $price;
            $price_new = $landing_price;
            $price_old = floor(($landing_price / (100 - $sale)) * 100); // Старая цена
            $product_id = $products;
            
            if (!isset($_SESSION["time_vizit"])) {
                $_SESSION["time_vizit"] = time();
            }
            if (!isset($_SESSION["referrer"])) {
                $_SESSION["referrer"] = $_SERVER["HTTP_REFERER"];
            }
            if (!isset($_SESSION["url_visit"])) {
                $_SESSION["url_visit"] = $_SERVER["REQUEST_URI"];
            }
        