require(["../../klinkby.resillient"], function (ResillientRequest) {
    var r = new ResillientRequest("http://www.google.com/");
    r.send();
});
