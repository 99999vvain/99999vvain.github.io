/* ============================================================
   应用层：hash 路由 + 页面渲染
   路由表：
     #/                首页
     #/articles        文章列表（?tag=xx 按标签筛选）
     #/article/<slug>  文章详情
     #/videos          视频
     #/progress        进度看板
     #/search          搜索
     #/about           关于我
   ============================================================ */
(function () {
  "use strict";

  var SITE = window.SITE || {};
  var ARTICLES = (window.DB_ARTICLES || []).slice().sort(byDateDesc);
  var VIDEOS = (window.DB_VIDEOS || []).slice().sort(byDateDesc);
  var PROGRESS = (window.DB_PROGRESS || []);

  var app = document.getElementById("app");
  var navEl = document.getElementById("site-nav");

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function byDateDesc(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }
  function byDateAsc(a, b) { return String(a.date || "").localeCompare(String(b.date || "")); }

  function tagChip(tag) {
    return '<a class="tag" href="#/articles?tag=' + encodeURIComponent(tag) + '">' + esc(tag) + "</a>";
  }
  function tagsHtml(tags) {
    return (tags || []).map(tagChip).join("");
  }

  /* ---------- 组件 ---------- */
  function articleCard(a) {
    return '<article class="card article-card">' +
      '<div class="card-meta">' + esc(a.date) + "</div>" +
      '<h3 class="card-title"><a href="#/article/' + encodeURIComponent(a.slug) + '">' +
        esc(a.title) + "</a></h3>" +
      (a.summary ? '<p class="card-summary">' + esc(a.summary) + "</p>" : "") +
      '<div class="card-tags">' + tagsHtml(a.tags) + "</div>" +
      "</article>";
  }

  function setDocTitle(t) {
    document.title = t ? t + " · " + (SITE.siteTitle || "数字花园") : (SITE.siteTitle || "数字花园");
  }

  function setNavActive(route) {
    if (!navEl) return;
    var links = navEl.querySelectorAll("a");
    for (var k = 0; k < links.length; k++) {
      links[k].className = links[k].getAttribute("data-route") === route ? "active" : "";
    }
  }

  /* ---------- 页面：首页 ---------- */
  function pageHome() {
    // 最近更新 = 文章 + 视频 按日期取前 3
    var feed = ARTICLES.map(function (a) {
      return { date: a.date, html: articleCard(a) };
    }).concat(VIDEOS.map(function (v) {
      return { date: v.date, html: videoCardLite(v) };
    })).sort(function (x, y) { return String(y.date).localeCompare(String(x.date)); }).slice(0, 3);

    var ongoing = PROGRESS.filter(function (p) { return (p.percent || 0) < 100; }).length;
    var done = PROGRESS.length - ongoing;

    app.innerHTML =
      '<div class="hero">' +
        '<h1 class="hero-name">' + esc(SITE.name) + "</h1>" +
        '<p class="hero-role">' + esc(SITE.role) + " · " + esc(SITE.slogan) + "</p>" +
        '<p class="hero-intro">' + esc(SITE.intro) + "</p>" +
        '<div class="interest-row">' +
          '<span class="interest-label">兴趣方向</span>' + tagsHtml(SITE.interests) +
        "</div>" +
        '<div class="stat-row">' +
          "<span><b>" + ARTICLES.length + "</b>篇文章</span>" +
          "<span><b>" + VIDEOS.length + "</b>个视频</span>" +
          "<span><b>" + ongoing + "</b>项进行中</span>" +
          "<span><b>" + done + "</b>项已完成</span>" +
        "</div>" +
      "</div>" +
      '<h2 class="section-title">最近更新</h2>' +
      feed.map(function (f) { return f.html; }).join("") +
      '<p class="result-note"><a href="#/articles">查看全部文章</a> · <a href="#/progress">看看进度看板</a></p>';
    setDocTitle("");
  }

  function videoCardLite(v) {
    var where = v.type === "bilibili"
      ? '<a href="https://www.bilibili.com/video/' + esc(v.bvid) + '" target="_blank" rel="noopener">B 站观看</a>'
      : '<a href="' + esc(v.url) + '" target="_blank" rel="noopener">前往观看</a>';
    return '<article class="card article-card">' +
      '<div class="card-meta">' + esc(v.date) + " · 视频</div>" +
      '<h3 class="card-title">' + (v.type === "bilibili"
        ? '<a href="https://www.bilibili.com/video/' + esc(v.bvid) + '" target="_blank" rel="noopener">' + esc(v.title) + "</a>"
        : '<a href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(v.title) + "</a>") +
      "</h3>" +
      (v.desc ? '<p class="card-summary">' + esc(v.desc) + "</p>" : "") +
      '<div class="card-tags">' + tagsHtml(v.tags) + " · " + where + "</div>" +
      "</article>";
  }

  /* ---------- 页面：文章列表 ---------- */
  function pageArticles(query) {
    var allTags = [];
    ARTICLES.forEach(function (a) {
      (a.tags || []).forEach(function (t) {
        if (allTags.indexOf(t) < 0) allTags.push(t);
      });
    });
    allTags.sort();

    var activeTag = query.tag || "";
    var list = activeTag
      ? ARTICLES.filter(function (a) { return (a.tags || []).indexOf(activeTag) >= 0; })
      : ARTICLES;

    app.innerHTML =
      '<h1 class="page-title">文章</h1>' +
      '<p class="page-sub">共 ' + ARTICLES.length + " 篇" +
        (activeTag ? " · 当前筛选标签：" + esc(activeTag) : "") + "</p>" +
      '<div class="filter-bar">' +
        '<a class="tag' + (activeTag ? "" : " on") + '" href="#/articles">全部</a>' +
        allTags.map(function (t) {
          return '<a class="tag' + (t === activeTag ? " on" : "") +
            '" href="#/articles?tag=' + encodeURIComponent(t) + '">' + esc(t) + "</a>";
        }).join("") +
      "</div>" +
      (list.length
        ? list.map(articleCard).join("")
        : '<p class="search-empty">这个标签下暂时没有文章。</p>');
    setDocTitle("文章");
  }

  /* ---------- 页面：文章详情 ---------- */
  function pageArticle(slug) {
    var idx = -1;
    for (var k = 0; k < ARTICLES.length; k++) {
      if (ARTICLES[k].slug === slug) { idx = k; break; }
    }
    if (idx < 0) {
      app.innerHTML = '<h1 class="page-title">没有这篇文章</h1>' +
        '<p class="page-sub">可能链接有误，<a href="#/articles">回到文章列表</a>。</p>';
      setDocTitle("404");
      return;
    }
    var a = ARTICLES[idx];
    var prev = ARTICLES[idx + 1]; // 列表按日期倒序，idx+1 是更早一篇
    var next = ARTICLES[idx - 1];

    app.innerHTML =
      '<article class="article-detail">' +
        '<div class="card-meta">' + esc(a.date) + "</div>" +
        '<h1 class="article-h1">' + esc(a.title) + "</h1>" +
        '<div class="card-tags">' + tagsHtml(a.tags) + "</div>" +
        '<div class="article-body">' + window.MdRender(a.content || "") + "</div>" +
        '<hr class="sep">' +
        '<div class="article-nav">' +
          (prev ? '<a class="prev" href="#/article/' + encodeURIComponent(prev.slug) + '">← 较早：' + esc(prev.title) + "</a>" : "<span></span>") +
          (next ? '<a class="next" href="#/article/' + encodeURIComponent(next.slug) + '">较新：' + esc(next.title) + " →</a>" : "<span></span>") +
        "</div>" +
      "</article>" +
      '<p class="result-note"><a href="#/articles">← 返回文章列表</a></p>';
    setDocTitle(a.title);
  }

  /* ---------- 页面：视频 ---------- */
  function videoCardHtml(v) {
    if (v.type === "link") {
      return '<div class="video-card video-link-card">' +
        '<a href="' + esc(v.url) + '" target="_blank" rel="noopener" class="video-frame">' +
          (v.cover
            ? '<img class="cover" src="' + esc(v.cover) + '" alt="' + esc(v.title) + '" loading="lazy">'
            : '<div class="video-cover-title">' + esc(v.title) + "</div>") +
          '<span class="external-hint">↗ 前往观看</span>' +
        "</a>" +
        '<div class="video-info">' +
          '<div class="card-meta">' + esc(v.date) + " · 外部链接</div>" +
          '<h3 class="card-title">' + esc(v.title) + "</h3>" +
          (v.desc ? '<p class="video-desc">' + esc(v.desc) + "</p>" : "") +
          '<div class="card-tags">' + tagsHtml(v.tags) + "</div>" +
        "</div>" +
      "</div>";
    }
    // bilibili 类型
    return '<div class="video-card">' +
      '<div class="video-frame" data-bvid="' + esc(v.bvid) + '">' +
        (v.cover
          ? '<img class="cover" src="' + esc(v.cover) + '" alt="' + esc(v.title) + '" loading="lazy">'
          : '<div class="video-cover-title">' + esc(v.title) + "</div>") +
        '<button class="video-play" type="button">' +
          '<span class="play-triangle"></span>点击播放</button>' +
      "</div>" +
      '<div class="video-info">' +
        '<div class="card-meta">' + esc(v.date) + " · B 站</div>" +
        '<h3 class="card-title">' + esc(v.title) + "</h3>" +
        (v.desc ? '<p class="video-desc">' + esc(v.desc) + "</p>" : "") +
        '<div class="card-tags">' + tagsHtml(v.tags) + "</div>" +
      "</div>" +
    "</div>";
  }

  function pageVideos() {
    app.innerHTML =
      '<h1 class="page-title">视频</h1>' +
      '<p class="page-sub">共 ' + VIDEOS.length + " 个 · 点击卡片内嵌播放 B 站视频</p>" +
      '<div class="video-grid">' + VIDEOS.map(videoCardHtml).join("") + "</div>";

    // 点击后懒加载 iframe（避免一页塞多个播放器拖慢加载）
    app.querySelectorAll(".video-frame[data-bvid]").forEach(function (frame) {
      frame.addEventListener("click", function () {
        var bvid = frame.getAttribute("data-bvid");
        frame.innerHTML =
          '<iframe src="https://player.bilibili.com/player.html?bvid=' + encodeURIComponent(bvid) +
          '&autoplay=1&danmaku=0&high_quality=1" ' +
          'scrolling="no" frameborder="0" allowfullscreen ' +
          'allow="autoplay; encrypted-media; fullscreen"></iframe>';
      });
    });
    setDocTitle("视频");
  }

  /* ---------- 页面：进度看板 ---------- */
  function progressItemHtml(p) {
    var pct = Math.max(0, Math.min(100, Number(p.percent) || 0));
    var done = pct >= 100;
    return '<div class="progress-item">' +
      '<div class="progress-head">' +
        '<span class="progress-name">' + esc(p.name) + "</span>" +
        '<span class="progress-pct' + (done ? " done" : "") + '">' + pct + "%</span>" +
      "</div>" +
      '<div class="progress-bar"><div class="progress-fill' + (done ? " done" : "") +
        '" style="width:' + pct + '%"></div></div>' +
      '<div class="progress-meta">' +
        "<span>" + esc(p.time) + "</span>" +
        (p.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") +
      "</div>" +
      (p.note ? '<p class="progress-note">' + esc(p.note) + "</p>" : "") +
    "</div>";
  }

  function pageProgress() {
    var done = PROGRESS.filter(function (p) { return (p.percent || 0) >= 100; });
    var ongoing = PROGRESS.filter(function (p) { return (p.percent || 0) < 100; });
    // 成长轨迹：按记录内 time 字段排序，从早到晚，读下来就是时间线
    var timeline = PROGRESS.slice().sort(function (a, b) {
      return String(a.time).localeCompare(String(b.time));
    });
    var avg = PROGRESS.length
      ? Math.round(PROGRESS.reduce(function (s, p) { return s + (Number(p.percent) || 0); }, 0) / PROGRESS.length)
      : 0;

    app.innerHTML =
      '<h1 class="page-title">进度看板</h1>' +
      '<p class="page-sub">项目与学习任务的成长轨迹，从早到晚</p>' +
      '<div class="progress-summary">' +
        '<div class="summary-box"><b>' + PROGRESS.length + "</b><span>总记录</span></div>" +
        '<div class="summary-box"><b>' + ongoing.length + "</b><span>进行中</span></div>" +
        '<div class="summary-box"><b>' + done.length + "</b><span>已完成</span></div>" +
        '<div class="summary-box"><b>' + avg + "%</b><span>平均进度</span></div>" +
      "</div>" +
      timeline.map(progressItemHtml).join("");
    setDocTitle("进度看板");
  }

  /* ---------- 页面：搜索 ---------- */
  function pageSearch() {
    app.innerHTML =
      '<h1 class="page-title">搜索</h1>' +
      '<input id="search-input" class="search-input" type="search" ' +
        'placeholder="输入关键词，匹配标题、标签、摘要…" autocomplete="off">' +
      '<p class="search-hint">实时匹配：文章（标题/标签/摘要）、视频（标题/标签/简介）、进度（名称/标签/备注）</p>' +
      '<div id="search-results"></div>';

    var input = document.getElementById("search-input");
    var box = document.getElementById("search-results");

    function hit(qLower, fields) {
      for (var k = 0; k < fields.length; k++) {
        if (String(fields[k] || "").toLowerCase().indexOf(qLower) >= 0) return true;
      }
      return false;
    }

    function run() {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        box.innerHTML = '<p class="search-empty">输入关键词开始搜索。</p>';
        return;
      }
      var arts = ARTICLES.filter(function (a) { return hit(q, [a.title, (a.tags || []).join(" "), a.summary]); });
      var vids = VIDEOS.filter(function (v) { return hit(q, [v.title, (v.tags || []).join(" "), v.desc, v.bvid, v.url]); });
      var progs = PROGRESS.filter(function (p) { return hit(q, [p.name, (p.tags || []).join(" "), p.note]); });

      if (!arts.length && !vids.length && !progs.length) {
        box.innerHTML = '<p class="search-empty">没有找到与「' + esc(input.value.trim()) + "」相关的内容。</p>";
        return;
      }
      box.innerHTML =
        (arts.length
          ? '<h2 class="search-group-title">文章（' + arts.length + "）</h2>" + arts.map(articleCard).join("")
          : "") +
        (vids.length
          ? '<h2 class="search-group-title">视频（' + vids.length + "）</h2>" +
            '<div class="video-grid">' + vids.map(videoCardHtml).join("") + "</div>"
          : "") +
        (progs.length
          ? '<h2 class="search-group-title">进度（' + progs.length + "）</h2>" + progs.map(progressItemHtml).join("")
          : "");
    }

    input.addEventListener("input", run);
    input.focus();
    box.innerHTML = '<p class="search-empty">输入关键词开始搜索。</p>';
    setDocTitle("搜索");
  }

  /* ---------- 页面：关于 ---------- */
  function pageAbout() {
    var c = SITE.contact || {};
    var contactRows = [
      c.email ? '<li>邮箱：<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a></li>" : "",
      c.github ? '<li>GitHub：<a href="' + esc(c.github) + '" target="_blank" rel="noopener">' + esc(c.github) + "</a></li>" : "",
      c.bilibili ? '<li>B 站：<a href="' + esc(c.bilibili) + '" target="_blank" rel="noopener">' + esc(c.bilibili) + "</a></li>" : "",
      c.mp ? "<li>" + esc(c.mp) + "</li>" : ""
    ].join("");

    app.innerHTML =
      '<h1 class="page-title">关于我</h1>' +
      '<p class="page-sub">' + esc(SITE.slogan) + "</p>" +
      '<div class="about-section">' +
        "<h2>" + esc(SITE.name) + "</h2>" +
        "<p>" + esc(SITE.role) + "</p>" +
        "<p>" + esc(SITE.intro) + "</p>" +
        '<div class="card-tags" style="margin-top:10px">' + tagsHtml(SITE.interests) + "</div>" +
      "</div>" +
      '<div class="about-section">' +
        "<h2>这座花园</h2>" +
        "<ul class=\"about-list\">" +
          "<li>纯静态站点，无数据库、无后端，数据即文件</li>" +
          "<li>文章用 Markdown 书写，渲染在浏览器端完成</li>" +
          "<li>所有代码开源可自由使用</li>" +
        "</ul>" +
      "</div>" +
      (contactRows
        ? '<div class="about-section"><h2>找到我</h2><ul class="about-list">' + contactRows + "</ul></div>"
        : "");
    setDocTitle("关于我");
  }

  /* ---------- 路由 ---------- */
  function parseHash() {
    var h = (location.hash || "#/").replace(/^#/, "");
    var parts = h.split("?");
    var path = parts[0] || "/";
    var query = {};
    if (parts[1]) {
      parts[1].split("&").forEach(function (kv) {
        var pair = kv.split("=");
        if (pair[0]) query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
      });
    }
    return { path: path, query: query };
  }

  function route() {
    var r = parseHash();
    var m;
    app.scrollTop = 0;
    window.scrollTo(0, 0);

    if (r.path === "/" || r.path === "") { setNavActive("/"); pageHome(); }
    else if (r.path === "/articles") { setNavActive("/articles"); pageArticles(r.query); }
    else if ((m = r.path.match(/^\/article\/(.+)$/))) { setNavActive("/articles"); pageArticle(decodeURIComponent(m[1])); }
    else if (r.path === "/videos") { setNavActive("/videos"); pageVideos(); }
    else if (r.path === "/progress") { setNavActive("/progress"); pageProgress(); }
    else if (r.path === "/search") { setNavActive("/search"); pageSearch(); }
    else if (r.path === "/about") { setNavActive("/about"); pageAbout(); }
    else {
      setNavActive("");
      app.innerHTML = '<h1 class="page-title">页面不存在</h1>' +
        '<p class="page-sub"><a href="#/">回到首页</a></p>';
      setDocTitle("404");
    }
  }

  // 初始化站点标题与页脚
  if (SITE.siteTitle) {
    document.title = SITE.siteTitle;
    document.getElementById("site-title").textContent = SITE.siteTitle;
  }
  if (SITE.footer) {
    document.getElementById("footer-text").textContent = SITE.footer;
  }

  window.addEventListener("hashchange", route);
  route();
})();
