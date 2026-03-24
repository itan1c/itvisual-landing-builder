<?php
include_once 'my_conf.php';
?>
<html>

<head>
	<title>Спасибо за заказ!</title>
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
	<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css">
	<link rel="preconnect" href="https://fonts.gstatic.com">
	<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

</head>

<body>
<div class="container">
		<div class="row">
			<div class="page-header">
				<p>Дякуємо за замовлення!</p>
				<span>Наш менеджер передзвонить Вам протягом 15 хвилин за номером: <br>
				<strong><?= $_GET['name'] ?? 'имя не указано' ?>   <?= $_GET['phone'] ?? 'номер не указан' ?></strong>
				</span>
				<span>
				<strong>Час роботи кол центру з 9:00-19:00</strong>
				</span>
				
				<div class="line"><img src="success_img/thankyou-divider.png" alt=""></div>
				<span style="font-size: 18px">
				Якщо ви помилилися під час заповнення форми, заповніть заявку ще раз
					<a class="back--link" href="javascript: history.back(-1);">Повернутись</a>
				</span>
			</div>
		</div>
	</div>

	<style>
		html * {
			max-height: 9999999px;
		}

		body>img {
			width: 0px;
			height: 0px;
		}

		html,
		body {
			min-width: 320px;
		}

		.box-title {
			width: 100%;
			text-align: center;
			font-size: 34px;
			margin: 0 0 10px 0;
		}

		.page-header {
			text-align: center;
			margin: 20px 0 20px 0;
			border-bottom: 0px;
		}

		.page-header a {
			text-decoration: underline;
		}

		.page-header a:hover {
			text-decoration: none;
		}

		.page-header p {
			font-size: 30px;
			margin: 0;
			font-weight: bold;
		}

		.page-header span {
			font-size: 22px;
			line-height: 30px;
		}

		/*--------box-------*/
		.box--grid {
			margin: 0 -20px;
			display: -webkit-flex;
			display: -moz-flex;
			display: -ms-flex;
			display: -o-flex;
			display: flex;
			justify-content: center;
			flex-wrap: wrap;
			border-top: 1px solid #eee;
			padding: 30px 0 0 0;
		}

		.box {
			width: calc(33% - 40px);
			padding: 20px 0 50px 0;
			background-color: white;
			box-shadow: 0px 7px 10px rgb(0 0 0 / 40%);
			border: 1px solid rgba(0, 0, 0, 0.4);
			margin: 20px;
			text-align: center;
			display: -webkit-flex;
			display: -moz-flex;
			display: -ms-flex;
			display: -o-flex;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
		}

		.box:hover {
			box-shadow: 0px 3px 10px rgb(0 162 88 / 90%)
		}

		.box-img {
			margin: 0 auto;
			display: block;
			max-width: 100%;
			max-height: 300px;
			height: 250px;
		}

		.box-img img {
			max-width: 100%;
			max-height: 100%;
			display: block;
		}

		.box-img a {
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.box-line {
			width: 80%;
			height: 1px;
			opacity: 0.5;
			background-color: #d7d7d7;
			border: 0.5px solid #e1e1e1;
			margin: 16px auto 19px;
		}

		.box-name {
			color: #303966;
			font-size: 20px;
			font-weight: 400;
			line-height: 28px;
			padding: 0 10%;
			margin: 0 0 15px 0;
		}

		.box-price {
			color: #bd2c26;
			font-size: 24px;
			font-weight: 700;
			margin: auto 0 15px 0;
			display: block;
		}

		.box-price span {
			color: #b8b8b8;
			font-family: OpenSans;
			font-size: 20px;
			font-weight: 400;
			text-decoration: line-through;
			padding-right: 64px;
		}

		.box-detail {
			color: #b388eb;
			font-family: OpenSans;
			font-size: 14px;
			font-weight: 400;
			line-height: 31px;
			cursor: pointer;
			margin-left: 10px;
		}

		.box-detail img {
			padding-left: 8px;
			padding-right: 10px;
		}

		.box-detail:hover {
			color: #b388eb;
		}

		.box-detail:hover img {
			padding-left: 18px;
			padding-right: 0;
			transition: 0.3s;
		}

		.box-detail:not(:hover) img {
			transition: 0.3s;
		}

		.box-button {
			width: 222px;
			height: 35px;
			line-height: 28px;
			border: 2px solid rgb(0, 162, 88);
			background: rgb(0, 162, 88);
			transition: all .3s;
			color: #ffffff;
		}

		.box-button a {
			color: #fff;
			text-decoration: none;
			display: block;
			width: 100%;
			height: 100%;
		}

		.box-button:hover {
			background: transparent;
		}

		.box-button:hover a {
			color: rgb(0, 162, 88);
		}

		.bh {
			width: 166px;
			height: 45px;
			cursor: pointer;
			position: absolute;
			z-index: 3;
			left: 50%;
			margin-left: -83px;
		}

		/*-------/box-------*/

		/* new styles */
		body {
			font-family: 'Roboto', sans-serif;
		}

		.page-header p {
			font-size: 40px;
			line-height: 1.2em;
			padding-bottom: 10px;
			font-weight: 700;
			color: rgb(10, 161, 80);
		}

		.page-header span {
			font-size: 20px;
			line-height: 1.2em;
			padding-bottom: 10px;
			font-weight: 500;
			display: block;
		}

		.line {
			font-size: 20px;
			line-height: 1.2em;
			padding-bottom: 10px;
			font-weight: 500;
		}

		.line img {
			max-width: 100%;
			height: auto;
		}

		.page-header .back--link {
			display: block;
			margin: 10px auto 0;
			width: 160px;
			min-height: 35px;
			line-height: 21px;
			border: 2px solid rgb(0, 162, 88);
			background: rgb(0, 162, 88);
			transition: all .3s;
			color: #ffffff;
			padding: 10px 20px;
			border-radius: 10px;
			text-decoration: none;
			text-transform: uppercase;
			font-size: 16px;
			text-decoration: none;
			margin-top: 20px;
		}

		.back--link:hover {
			background-color: transparent;
			text-decoration: none;
			color: rgb(0, 162, 88);
		}

		.box-title {
			text-align: center;
			margin-top: 0;
			font-size: 23px;
			font-family: "Arial";
			color: rgb(255, 255, 255);
			font-weight: bold;
			text-transform: uppercase;
			padding-top: 15px;
			padding-bottom: 15px;
			background: transparent url('success_img/t-bg-2.jpg') repeat scroll 0% 0%;
			border-bottom: 1px solid rgb(200, 200, 200);
		}

		.box-title small {
			display: block;
		}

		/* end new */
		@media (max-width: 992px) {
			.box {
				width: calc(50% - 40px);
			}
		}

		@media (max-width: 768px) {
			.box {
				width: calc(100% - 40px);
			}

			.box-title {
				font-size: 18px;
			}
		}

		@media screen and (max-width: 500px) {
			.page-header {
				max-width: 95%;
				margin-left: auto;
				margin-right: auto;
			}

			.page-header p {
				font-size: 26px;
				margin: 0;
				font-weight: bold;
			}

			.page-header span {
				font-size: 17px;
				line-height: 27px;
			}

			.page-header strong {
				font-size: 19px;
			}

			.box-title {
				font-size: 14px;
			}

			.box-title small {
				margin-top: 10px;
			}
		}
	</style>

	<script type='text/javascript'>
	    function cnv_pixel() {
	        tracker_url = 'https://' + window.location.hostname;
	        
	        var o = document.createElement('img');
	        o.src = tracker_url + '/click.php?cnv_id=<?= $_GET['clickid'] ?? '' ?>&payout=<?= $_GET['price'] ?? '' ?>&cnv_status=new';
	    }

	    cnv_pixel();
	</script>

	<script src="https://code.jquery.com/jquery-3.3.1.min.js"></script>
	<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
</body>

</html>
