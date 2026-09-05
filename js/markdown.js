/* ============================================================
   轻量 Markdown 渲染器（零依赖，离线可用）
   支持：标题 / 加粗 / 斜体 / 行内代码 / 代码块 /
        无序&有序列表 / 引用 / 链接 / 图片 / 分割线 / 段落
   不支持：表格、脚注（如需可后续扩展）
   ============================================================ */
(function () {
  "use strict";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* 行内元素渲染 */
  function renderInline(text) {
    var s = escapeHtml(text);
    // 行内代码（最先处理，防止内部被二次解析）
    s = s.replace(/`([^`]+)`/g, function (m, c) {
      return "<code>" + c + "</code>";
    });
    // 图片 ![alt](src)
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
      '<img src="$2" alt="$1" loading="lazy">');
    // 链接 [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // 加粗 / 斜体
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return s;
  }

  /* 块级渲染 */
  function render(src) {
    var lines = String(src).replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      /* 代码块 ``` */
      if (/^```/.test(line)) {
        var lang = line.slice(3).trim();
        var buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        i++; // 跳过结束围栏（未闭合也安全退出）
        out.push("<pre" + (lang ? ' class="lang-' + escapeHtml(lang) + '"' : "") +
          "><code>" + escapeHtml(buf.join("\n")) + "</code></pre>");
        continue;
      }

      /* 空行 */
      if (/^\s*$/.test(line)) { i++; continue; }

      /* 标题 # ~ #### */
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        var lv = h[1].length;
        out.push("<h" + lv + ">" + renderInline(h[2]) + "</h" + lv + ">");
        i++;
        continue;
      }

      /* 分割线 --- *** */
      if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
        out.push("<hr>");
        i++;
        continue;
      }

      /* 引用 > */
      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        out.push("<blockquote><p>" + renderInline(q.join(" ")) + "</p></blockquote>");
        continue;
      }

      /* 无序列表 - / * */
      if (/^[-*]\s+/.test(line)) {
        var ul = [];
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
          ul.push("<li>" + renderInline(lines[i].replace(/^[-*]\s+/, "")) + "</li>");
          i++;
        }
        out.push("<ul>" + ul.join("") + "</ul>");
        continue;
      }

      /* 有序列表 1. / 1) */
      if (/^\d+[.)]\s+/.test(line)) {
        var ol = [];
        while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
          ol.push("<li>" + renderInline(lines[i].replace(/^\d+[.)]\s+/, "")) + "</li>");
          i++;
        }
        out.push("<ol>" + ol.join("") + "</ol>");
        continue;
      }

      /* 段落：连续普通行合并 */
      var para = [line];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
             !/^(#{1,4}\s|```|>|[-*]\s|\d+[.)]\s|(-{3,}|\*{3,})\s*$)/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      out.push("<p>" + renderInline(para.join("\n")).replace(/\n/g, "<br>") + "</p>");
    }

    return out.join("\n");
  }

  window.MdRender = render;
})();
