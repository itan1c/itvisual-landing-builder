$(document).ready((function(){
  // Smooth scroll + select sync
  $("a[href^='#']").click((function(){
    var e=$(this).attr("href"),o=$(this).parent().find("h3").text();
    $("#order_form select[name='type'] option[value='"+o+"']").prop("selected",!0);
    $("html, body").animate({scrollTop:$(e).offset().top+"px"});
    return !1;
  }));

  // Owl carousel
  $(window).on("load",(function(){
    $(".owl-carousel").owlCarousel({items:1,loop:!0,autoHeight:!0,smartSpeed:300,mouseDrag:!1,pullDrag:!1,nav:!0,navText:""});
  }));

  // ── Countdown timer ────────────────────────────────────────────────────────
  // Sets a deadline 3 days from first visit (stored in cookie/localStorage so it
  // doesn't reset on every reload). Uses class selectors from the template HTML.
  (function initCountdown(){
    var KEY = 'promo_deadline';
    var THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    var stored = localStorage.getItem(KEY);
    var deadline;
    if (stored && !isNaN(+stored) && +stored > Date.now()) {
      deadline = +stored;
    } else {
      deadline = Date.now() + THREE_DAYS;
      localStorage.setItem(KEY, deadline);
    }

    function pad(n){ return n < 10 ? '0' + n : '' + n; }

    function tick(){
      var diff = Math.max(0, deadline - Date.now());
      var days  = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var mins  = Math.floor((diff % 3600000)  / 60000);
      var secs  = Math.floor((diff % 60000)    / 1000);

      // Support both structural patterns used in templates
      $('.timer .count.hours, .timer_item .count.hours').each(function(){ $(this).text(pad(hours)); });
      $('.timer .count.minutes, .timer_item .count.minutes').each(function(){ $(this).text(pad(mins)); });
      $('.timer .count.seconds, .timer_item .count.seconds').each(function(){ $(this).text(pad(secs)); });
      // Days: first .count inside .timer that has no extra class
      $('.timer .timer_item:first-child .count, .timer_block .timer_item:first-child .count').each(function(){ $(this).text(pad(days)); });
    }

    if($('.timer').length || $('.timer_block').length){
      tick();
      setInterval(tick, 1000);
    }
  })();
}));
