(function () {
  var tablist = document.querySelector("[data-tabs]");
  if (!tablist) return;

  var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (tab) {
    return document.getElementById(tab.getAttribute("aria-controls"));
  });

  function select(index, focus, updateHash) {
    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      panels[i].classList.toggle("is-active", on);
      panels[i].hidden = !on;
    });
    if (focus) tabs[index].focus();
    var id = tabs[index].getAttribute("data-tab");
    if (updateHash && id && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + id);
    }
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      select(i, false, true);
    });
    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (i + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (i - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      select(next, true, true);
    });
  });

  var hash = window.location.hash.replace(/^#/, "");
  var start = tabs.findIndex(function (tab) {
    return tab.getAttribute("data-tab") === hash;
  });
  select(start === -1 ? 0 : start, false, start !== -1);
})();
