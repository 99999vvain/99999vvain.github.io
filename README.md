# V 的数字花园 · 使用手册

纯静态个人网站：线上知识库 + 作品展示 + 成长进度记录。
**无数据库、无后端、无构建工具、零依赖、零成本**——所有资源开源可自由使用。

---

## 一、文件夹结构

```
digital-garden/
├── index.html            入口页面（路由挂载点）
├── css/
│   └── style.css         全部样式（改配色、字体在这里）
├── js/
│   ├── data.js           站点配置：名字、简介、联系方式
│   ├── markdown.js       轻量 Markdown 渲染器（零依赖，离线可用）
│   └── app.js            路由 + 各页面渲染逻辑（一般不用动）
├── content/              ← 你日常只改这个文件夹
│   ├── articles.js       文章数据（新增文章在这里）
│   ├── videos.js         视频数据（B 站嵌入 / 外链卡片）
│   └── progress.js       进度看板数据
├── assets/               （可选）封面图、图片等素材放这里
├── DESIGN.md             视觉规则：配色、字号、间距、组件约定
└── README.md             本文件
```

## 二、本地怎么打开预览

**方式 A（最简单）**：直接双击 `index.html`，浏览器里就能完整运行。
本站所有数据都写在 JS 文件里，不需要本地服务器，`file://` 协议下一切功能正常（含文章、搜索、视频嵌入）。

**方式 B（推荐，地址更好看）**：在本文件夹打开终端，任选其一：

```bash
# Python（电脑上有 Python 就行）
python -m http.server 8000
# 然后浏览器打开 http://localhost:8000

# Node.js
npx serve .
```

## 三、怎么新增一篇文章

打开 `content/articles.js`，复制任意一个 `{ ... }` 块粘到数组末尾，改内容即可：

```js
{
  slug: "my-new-post",              // 唯一标识：英文/数字/连字符（决定 URL）
  title: "文章标题",
  date: "2026-09-10",               // 列表按日期倒序排列
  tags: ["随笔", "学习笔记"],        // 任意标签，列表页会自动生成筛选按钮
  summary: "一句话摘要，显示在列表和搜索结果里。",
  content: [                        // 正文按行写，Markdown 语法
    "# 一级标题",
    "",
    "正文段落，支持 **加粗**、*斜体*、[链接](https://example.com)。",
    "",
    "- 列表项一",
    "- 列表项二",
    "",
    "> 引用：写点提醒自己的话",
    "",
    "  "
  ].join("\n")
}
```

保存 → 刷新浏览器，文章立刻出现在列表、首页「最近更新」和搜索里。

**支持的 Markdown 语法**：标题 `#`~`####`、加粗 `**x**`、斜体 `*x*`、
行内代码、代码块（\`\`\` 围栏）、有序/无序列表、引用 `>`、链接、图片、分割线 `---`。
暂不支持表格，用列表代替。

**几个注意点**：

- `slug` 不要和已有文章重复；
- 正文里写代码块时，反引号前要加反斜杠转义（参考 `articles.js` 里 Python 那篇的写法）；
- 文章配图放在 `assets/` 文件夹，正文里用 `![说明](assets/xx.jpg)` 引用。

## 四、怎么改视频 / 进度数据

- **视频**（`content/videos.js`）：B 站视频填 `type: "bilibili"` + `bvid`（就是视频地址里 `BV` 开头那串）；站外视频填 `type: "link"` + `url`，可选配 `cover` 封面图。
- **进度**（`content/progress.js`）：每条填名称、时间段、`percent`（0–100，填 100 自动算已完成并变绿）、标签、备注。看板会按时间排序，从上往下读就是你的成长轨迹。

## 五、怎么部署到免费平台（三选一）

### 方案 1：GitHub Pages（最经典）

1. 注册/登录 [GitHub](https://github.com)，新建仓库（名字随意，比如 `digital-garden`，公开）；
2. 把本文件夹所有文件上传到仓库（网页端直接拖拽上传即可，或用 git）；
3. 仓库页面 → `Settings` → `Pages` → `Branch` 选 `main`、目录选 `/ (root)` → `Save`；
4. 等一两分钟，访问 `https://你的用户名.github.io/digital-garden/` 即已上线。
   以后改文章 = 改 `content/` 里的文件 → 提交到 GitHub → 自动更新。

### 方案 2：Vercel（速度最快，国内可访问性一般）

1. 先把代码推到 GitHub 仓库（同上第 1、2 步）；
2. 登录 [vercel.com](https://vercel.com)（可用 GitHub 账号一键登录）；
3. `Add New Project` → 选中仓库 → 全部默认 → `Deploy`，几十秒上线。
   之后每次 git push 自动重新部署。

### 方案 3：Netlify（支持免 git 拖拽部署）

1. 登录 [netlify.com](https://netlify.com)；
2. `Add new site` → `Deploy manually` → 把整个 `digital-garden` 文件夹拖进网页；
3. 立刻得到一个 `xxx.netlify.app` 地址。更新时在站点页面的 `Deploys` 标签重新拖拽即可。

> 三个平台免费额度对个人站绰绰有余。国内访问体验：Netlify / Vercel 时快时慢，
> GitHub Pages 比较稳定；都不需要备案（部署在境外）。

## 六、常用自定义

| 想改什么 | 改哪里 |
|---|---|
| 名字、简介、联系方式 | `js/data.js` |
| 配色、字体、间距 | `css/style.css` 顶部的 `:root` 变量 |
| 视觉规则（改样式前先看） | `DESIGN.md` |
| 文章 | `content/articles.js` |
| 视频 | `content/videos.js` |
| 进度看板 | `content/progress.js` |

配色变量示例（`css/style.css` 第一屏）：

```css
--canvas: #f6f4ee;   /* 页面纸底 */
--ink:    #16140f;   /* 标题与正文 */
--accent: #5d6342;   /* 橄榄墨：链接、进度、强调 */
--marker: #f0ecb6;   /* 荧光笔：选中与加粗底纹 */
```

改这四个变量就能整体换气质，其余全部自动跟随。
**注意**：整站只允许一个强调色，加第二种颜色会立刻失去现在的克制感。
