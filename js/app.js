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

   版式约定（编辑式）：日期等宽居左、标题衬线、标签居右，
   全部用发丝线分隔，不用卡片阴影。
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
  function dots(d) { return String(d || "").replace(/-/g, "."); }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function readingWords(text) {
    return String(text || "").replace(/[#>*`\-\[\]()\|\s]/g, "").length;
  }

  /* ---------- 动效：尊重系统减少动效设置 ---------- */
  var motionQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  function reducedMotion() {
    return !!(motionQuery && motionQuery.matches);
  }

  var REVEAL_SELECTOR = [
    ".page-kicker", ".page-title", ".page-sub", ".hero", ".section-head",
    ".filter-bar", ".entry", ".video-card", ".board-summary", ".record",
    ".post-head", ".post-body", ".about-block", ".search-input", ".search-hint"
  ].join(",");

  // 按 DOM 顺序做阶梯入场，最多 8 级，避免长列表无限拖延
  function revealContent() {
    if (reducedMotion()) return;
    var nodes = app.querySelectorAll(REVEAL_SELECTOR);
    for (var k = 0; k < nodes.length; k++) {
      nodes[k].style.setProperty("--i", Math.min(k, 8));
      nodes[k].classList.add("reveal");
    }
  }

  var barObserver = null;

  // 进度条只在进入视口时从 0 长到目标值；减少动效时保持最终宽度
  function animateBars() {
    if (barObserver) { barObserver.disconnect(); barObserver = null; }
    if (reducedMotion()) return;
    if (typeof window.IntersectionObserver !== "function") return;

    var bars = app.querySelectorAll(".bar > span");
    if (!bars.length) return;

    barObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transition = "width 640ms cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.width = el.getAttribute("data-w") || "0%";
        barObserver.unobserve(el);
      });
    }, { threshold: 0.25 });

    for (var k = 0; k < bars.length; k++) {
      var el = bars[k];
      el.setAttribute("data-w", el.style.width || "0%");
      el.style.transition = "none";
      el.style.width = "0%";
      barObserver.observe(el);
    }
  }

  function tagSpans(tags) {
    return (tags || []).map(function (t) {
      return '<span class="tag">' + esc(t) + "</span>";
    }).join("");
  }

  function tagLinks(tags, activeTag) {
    return (tags || []).map(function (t) {
      return '<a class="tag' + (t === activeTag ? " on" : "") +
        '" href="#/articles?tag=' + encodeURIComponent(t) + '">' + esc(t) + "</a>";
    }).join("");
  }

  /* ---------- 组件：条目行 ---------- */
  function entryRow(item) {
    var isVideo = item.kind === "video";
    var href = isVideo
      ? (item.type === "bilibili"
          ? "https://www.bilibili.com/video/" + item.bvid
          : item.url)
      : "#/article/" + encodeURIComponent(item.slug);
    var external = isVideo ? ' target="_blank" rel="noopener"' : "";

    return '<a class="entry" href="' + esc(href) + '"' + external + ">" +
      '<div class="entry-aside">' +
        '<time class="entry-date" datetime="' + esc(item.date || "") + '">' + esc(dots(item.date)) + "</time>" +
        (isVideo ? '<span class="kind">视频</span>' : "") +
      "</div>" +
      '<div class="entry-body">' +
        '<h3 class="entry-title">' + esc(item.title) + "</h3>" +
        (item.summary ? '<p class="entry-summary">' + esc(item.summary) + "</p>" : "") +
      "</div>" +
      '<div class="entry-tags">' + tagSpans(item.tags) + "</div>" +
    "</a>";
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

  /* ---------- 首页 ---------- */
  function pageHome() {
    var feed = ARTICLES.map(function (a) {
      return { date: a.date, item: a };
    }).concat(VIDEOS.map(function (v) {
      return { date: v.date, item: v, kind: "video" };
    })).sort(function (x, y) {
      return String(y.date).localeCompare(String(x.date));
    }).slice(0, 4);

    var rows = feed.map(function (f) {
      var it = f.item;
      return entryRow({
        date: it.date,
        kind: f.kind,
        type: it.type,
        bvid: it.bvid,
        url: it.url,
        slug: it.slug,
        title: it.title,
        summary: it.summary || it.desc,
        tags: it.tags
      });
    }).join("");

    var ongoing = PROGRESS.filter(function (p) { return (p.percent || 0) < 100; }).length;

    app.innerHTML =
      '<header class="hero">' +
        '<p class="eyebrow">Digital Garden · ' + new Date().getFullYear() + "</p>" +
        '<h1 class="hero-name">' + esc(SITE.name) + "</h1>" +
        '<p class="hero-lede">' + esc(SITE.intro) + "</p>" +
        '<div class="hero-foot">' +
          '<div class="hero-tags">' +
            (SITE.interests || []).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") +
          "</div>" +
          '<div class="hero-stats">' +
            "<span><b>" + pad2(ARTICLES.length) + "</b>篇文章</span>" +
            (VIDEOS.length ? "<span><b>" + pad2(VIDEOS.length) + "</b>个视频</span>" : "") +
            "<span><b>" + pad2(ongoing) + "</b>项进行中</span>" +
          "</div>" +
        "</div>" +
      "</header>" +
      '<div class="section-head"><h2>最近更新</h2>' +
        '<a href="#/articles">全部文章 →</a></div>' +
      '<div class="entry-list">' + rows + "</div>" +
      '<p class="result-note"><a href="#/progress">看看进度看板 →</a></p>';

    setDocTitle("");
  }

  /* ---------- 文章列表 ---------- */
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
      '<p class="page-kicker">Articles · ' + pad2(ARTICLES.length) + " 篇</p>" +
      '<h1 class="page-title">文章</h1>' +
      '<p class="page-sub">学习笔记、随笔与项目记录。按日期倒序排列，点标签可以只看一类。</p>' +
      '<div class="filter-bar">' +
        '<a class="tag' + (activeTag ? "" : " on") + '" href="#/articles">全部</a>' +
        tagLinks(allTags, activeTag) +
      "</div>" +
      '<div class="entry-list">' +
        (list.length
          ? list.map(entryRow).join("")
          : '<p class="search-empty">这个标签下暂时没有文章。</p>') +
      "</div>";
    setDocTitle("文章");
  }

  /* ---------- 文章详情 ---------- */
  function pageArticle(slug) {
    var idx = -1;
    for (var k = 0; k < ARTICLES.length; k++) {
      if (ARTICLES[k].slug === slug) { idx = k; break; }
    }
    if (idx < 0) {
      app.innerHTML = '<p class="page-kicker">404</p>' +
        '<h1 class="page-title">没有这篇文章</h1>' +
        '<p class="page-sub">链接可能已失效，<a href="#/articles">回到文章列表</a>。</p>';
      setDocTitle("没有这篇文章");
      return;
    }

    var a = ARTICLES[idx];
    var prev = ARTICLES[idx + 1]; // 日期更早
    var next = ARTICLES[idx - 1]; // 日期更新
    var words = readingWords(a.content);
    var minutes = Math.max(1, Math.round(words / 400));

    app.innerHTML =
      '<article class="post">' +
        '<header class="post-head">' +
          '<p class="page-kicker">' + (a.tags || []).map(esc).join(" / ") + "</p>" +
          '<h1 class="post-title">' + esc(a.title) + "</h1>" +
          '<p class="post-meta">' +
            '<span>' + esc(dots(a.date)) + "</span>" +
            '<span class="dot">·</span><span>约 ' + words + " 字</span>" +
            '<span class="dot">·</span><span>' + minutes + " 分钟</span>" +
          "</p>" +
        "</header>" +
        '<div class="post-body">' + window.MdRender(a.content || "") + "</div>" +
        '<nav class="post-foot" aria-label="文章导航">' +
          (prev
            ? '<a class="prev" href="#/article/' + encodeURIComponent(prev.slug) + '">' +
              '<span class="k">较早</span><span class="t">' + esc(prev.title) + "</span></a>"
            : "<span></span>") +
          (next
            ? '<a class="next" href="#/article/' + encodeURIComponent(next.slug) + '">' +
              '<span class="k">较新</span><span class="t">' + esc(next.title) + "</span></a>"
            : "<span></span>") +
        "</nav>" +
      "</article>" +
      '<p class="result-note"><a href="#/articles">← 返回文章列表</a></p>';
    setDocTitle(a.title);
  }

  /* ---------- 视频 ---------- */
  function videoCard(v) {
    // 有封面用封面；没有封面就留白，标题只在下方面板出现一次
    var cover = v.cover
      ? '<img class="cover" src="' + esc(v.cover) + '" alt="' + esc(v.title) + '" loading="lazy">'
      : "";

    var info = '<div class="video-info">' +
      '<h3 class="entry-title">' + esc(v.title) + "</h3>" +
      (v.desc ? '<p class="video-desc">' + esc(v.desc) + "</p>" : "") +
      '<div class="video-meta"><span>' + esc(dots(v.date)) + "</span>" +
        (v.tags || []).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") +
      "</div>" +
    "</div>";

    if (v.type === "link") {
      return '<a class="video-card video-link-card" href="' + esc(v.url) +
        '" target="_blank" rel="noopener">' +
        '<div class="video-frame">' + cover +
          '<span class="link-ring">↗</span>' +
          '<span class="external-hint">外部链接</span></div>' +
        info +
      "</a>";
    }

    return '<div class="video-card">' +
      '<div class="video-frame" data-bvid="' + esc(v.bvid) + '">' + cover +
        '<button class="video-play" type="button" aria-label="播放：' + esc(v.title) + '">' +
          '<span class="play-ring"><span class="play-triangle"></span></span>' +
          "<span>播放</span>" +
        "</button>" +
      "</div>" +
      info +
    "</div>";
  }

  function pageVideos() {
    var hasVideos = VIDEOS.length > 0;

    app.innerHTML =
      '<p class="page-kicker">Videos · ' + pad2(VIDEOS.length) + " 个</p>" +
      '<h1 class="page-title">视频</h1>' +
      (hasVideos
        ? '<p class="page-sub">点击卡片内嵌播放 B 站视频，播放器只在点击后加载。</p>' +
          '<div class="video-grid">' + VIDEOS.map(videoCard).join("") + "</div>"
        : '<p class="page-sub">视频还在录，先空着。等有第一条了就放上来。</p>' +
          '<p class="search-empty">这里暂时没有视频。</p>');

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

  /* ---------- 进度看板 ---------- */
  function recordRow(p) {
    var pct = Math.max(0, Math.min(100, Number(p.percent) || 0));
    var done = pct >= 100;

    return '<div class="record">' +
      '<div class="record-pct' + (done ? " is-done" : "") + '">' + pct + "<span>%</span></div>" +
      '<div class="record-main">' +
        '<div class="record-head">' +
          '<h3 class="record-name">' + esc(p.name) + "</h3>" +
          (done ? '<span class="record-done">DONE</span>' : "") +
        "</div>" +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="record-meta"><span>' + esc(p.time) + "</span>" +
          (p.tags || []).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") +
        "</div>" +
        (p.note ? '<p class="record-note">' + esc(p.note) + "</p>" : "") +
      "</div>" +
    "</div>";
  }

  function pageProgress() {
    var doneCount = PROGRESS.filter(function (p) { return (Number(p.percent) || 0) >= 100; }).length;
    var ongoing = PROGRESS.length - doneCount;
    var avg = PROGRESS.length
      ? Math.round(PROGRESS.reduce(function (s, p) { return s + (Number(p.percent) || 0); }, 0) / PROGRESS.length)
      : 0;

    // 按 time 字段正序，读下来就是一条从早到晚的轨迹
    var timeline = PROGRESS.slice().sort(function (a, b) {
      return String(a.time).localeCompare(String(b.time));
    });

    app.innerHTML =
      '<p class="page-kicker">Progress · ' + pad2(PROGRESS.length) + " 条记录</p>" +
      '<h1 class="page-title">进度看板</h1>' +
      '<p class="page-sub">项目与学习任务按开始时间排列。数字是进度，横线是距离。</p>' +
      '<div class="board-summary">' +
        '<div class="board-cell"><b>' + pad2(PROGRESS.length) + "</b><span>总记录</span></div>" +
        '<div class="board-cell"><b>' + pad2(ongoing) + "</b><span>进行中</span></div>" +
        '<div class="board-cell"><b>' + pad2(doneCount) + "</b><span>已完成</span></div>" +
        '<div class="board-cell"><b>' + avg + "%</b><span>平均进度</span></div>" +
      "</div>" +
      '<div class="record-list">' + timeline.map(recordRow).join("") + "</div>";
    setDocTitle("进度看板");
  }

  /* ---------- 搜索 ---------- */
  function pageSearch() {
    app.innerHTML =
      '<p class="page-kicker">Search</p>' +
      '<h1 class="page-title">搜索</h1>' +
      '<input id="search-input" class="search-input" type="search" ' +
        'placeholder="输入关键词…" autocomplete="off" aria-label="搜索关键词">' +
      '<p class="search-hint">匹配范围：文章标题 / 标签 / 摘要，视频标题 / 简介，进度名称 / 备注</p>' +
      '<div id="search-results"></div>';

    var input = document.getElementById("search-input");
    var box = document.getElementById("search-results");

    function hit(q, fields) {
      for (var k = 0; k < fields.length; k++) {
        if (String(fields[k] || "").toLowerCase().indexOf(q) >= 0) return true;
      }
      return false;
    }

    function run() {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        box.innerHTML = '<p class="search-empty">输入关键词开始搜索。</p>';
        return;
      }

      var arts = ARTICLES.filter(function (a) {
        return hit(q, [a.title, (a.tags || []).join(" "), a.summary]);
      });
      var vids = VIDEOS.filter(function (v) {
        return hit(q, [v.title, (v.tags || []).join(" "), v.desc, v.bvid, v.url]);
      });
      var progs = PROGRESS.filter(function (p) {
        return hit(q, [p.name, (p.tags || []).join(" "), p.note]);
      });

      if (!arts.length && !vids.length && !progs.length) {
        box.innerHTML = '<p class="search-empty">没有找到「' + esc(input.value.trim()) + "」相关内容。</p>";
        return;
      }

      box.innerHTML =
        (arts.length
          ? '<h2 class="search-group-title">文章 · ' + arts.length + "</h2>" +
            '<div class="entry-list">' + arts.map(entryRow).join("") + "</div>"
          : "") +
        (vids.length
          ? '<h2 class="search-group-title">视频 · ' + vids.length + "</h2>" +
            '<div class="video-grid">' + vids.map(videoCard).join("") + "</div>"
          : "") +
        (progs.length
          ? '<h2 class="search-group-title">进度 · ' + progs.length + "</h2>" +
            progs.map(recordRow).join("")
          : "");
    }

    input.addEventListener("input", run);
    input.focus();
    box.innerHTML = '<p class="search-empty">输入关键词开始搜索。</p>';
    setDocTitle("搜索");
  }

  /* ---------- 关于 ---------- */
  function pageAbout() {
    var c = SITE.contact || {};

    // 邮箱两段拼接：让源码里不出现完整地址，降低被爬虫收集的概率
    var email = c.emailUser && c.emailDomain
      ? c.emailUser + String.fromCharCode(64) + c.emailDomain
      : (c.email || "");

    var rows = [
      email ? '<li><span class="k">Email</span><span><a href="mailto:' + esc(email) + '">' + esc(email) + "</a></span></li>" : "",
      c.github ? '<li><span class="k">GitHub</span><span><a href="' + esc(c.github) + '" target="_blank" rel="noopener">' + esc(c.github) + "</a></span></li>" : "",
      c.bilibili ? '<li><span class="k">Bilibili</span><span><a href="' + esc(c.bilibili) + '" target="_blank" rel="noopener">' + esc(c.bilibili) + "</a></span></li>" : "",
      c.mp ? '<li><span class="k">公众号</span><span>' + esc(c.mp) + "</span></li>" : ""
    ].join("");

    app.innerHTML =
      '<p class="page-kicker">About</p>' +
      '<h1 class="page-title">' + esc(SITE.name) + "</h1>" +
      '<p class="page-sub">' + esc(SITE.role) + " · " + esc(SITE.slogan) + "</p>" +
      '<div class="about-block">' +
        "<h2>简介</h2><p>" + esc(SITE.intro) + "</p>" +
        '<div class="hero-tags">' +
          (SITE.interests || []).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") +
        "</div>" +
      "</div>" +
      '<div class="about-block"><h2>这座花园</h2>' +
        '<ul class="about-list">' +
          '<li><span class="k">技术</span><span>纯静态页面，无数据库、无后端、无构建步骤</span></li>' +
          '<li><span class="k">写作</span><span>Markdown 写在 content/ 里，浏览器端渲染</span></li>' +
          '<li><span class="k">成本</span><span>零，托管在免费静态平台上</span></li>' +
        "</ul>" +
      "</div>" +
      (rows ? '<div class="about-block"><h2>找到我</h2><ul class="about-list">' + rows + "</ul></div>" : "");
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
      app.innerHTML = '<p class="page-kicker">404</p>' +
        '<h1 class="page-title">页面不存在</h1>' +
        '<p class="page-sub"><a href="#/">回到首页</a></p>';
      setDocTitle("页面不存在");
    }

    revealContent();
    animateBars();
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
