$(".navs").click(function (e) {
  console.log("clicked");
  e.preventDefault();
  var aid = $(this).attr("href");
  $("html,body").animate({ scrollTop: $(aid).offset().top }, "slow");
});
