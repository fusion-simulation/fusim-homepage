import lume from "lume/mod.ts";
import remark from "lume/plugins/remark.ts";
import prism from "lume/plugins/prism.ts";
import katex from "lume/plugins/katex.ts";
import date from "lume/plugins/date.ts";
import postcss from "lume/plugins/postcss.ts";
import icons from "lume/plugins/icons.ts";

import cssnano from "npm:cssnano@7.1.2";
import { data } from "./data.ts";

const site = lume();

type PublicationDataNode = {
  type: "file";
  name: string;
  url: string;
  sizeStr: string;
} | {
  type: "dir";
  name: string;
  url: string;
  children: PublicationDataNode[];
};

type PublicationItem = {
  url: string;
  title: string;
  meta: string;
  dataHtml: string;
};

type PublicationGroup = {
  year: string;
  items: PublicationItem[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function renderDataNodes(nodes: PublicationDataNode[]): string {
  if (nodes.length === 0) return "";
  let html = `<ul style="list-style: none; padding: 0; margin-top: 0.3rem;">`;
  for (const node of nodes) {
    if (node.type === "file") {
      html += `<li style="margin-bottom: 0.2rem;">
        <a href="${node.url}" target="_blank" rel="noopener noreferrer" download>
          📄 ${node.name}
        </a>
        <span class="meta" style="margin-left: 0.5rem; font-size: 0.8em; color: var(--text-muted, #888);">(${node.sizeStr})</span>
      </li>`;
    } else {
      html += `<li style="margin-bottom: 0.2rem;">
        <details>
          <summary style="cursor: pointer; user-select: none; outline: none; display: inline-block;">
            📁 <a href="${node.url}" target="_blank" style="color: inherit; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${node.name}</a>
          </summary>
          <div style="padding-left: 1.5rem; margin-top: 0.2rem;">
            ${renderDataNodes(node.children)}
          </div>
        </details>
      </li>`;
    }
  }
  html += `</ul>`;
  return html;
}

const dirPagesToGenerate: { url: string; name: string; children: PublicationDataNode[]; parentUrl: string }[] = [];

async function collectPublications(root: string): Promise<PublicationGroup[]> {
  const items: Array<PublicationItem & { year: string; sortKey: string }> = [];

  try {
    for await (const yearEntry of Deno.readDir(root)) {
      if (!yearEntry.isDirectory || yearEntry.name.startsWith(".")) continue;
      const year = yearEntry.name;
      const yearDir = `${root}/${year}`;

      for await (const itemEntry of Deno.readDir(yearDir)) {
        if (!itemEntry.isDirectory || itemEntry.name.startsWith(".")) continue;
        const itemName = itemEntry.name;
        const itemDir = `${yearDir}/${itemName}`;

        let pdfEntry: Deno.DirEntry | null = null;
        const nonPdfs: Deno.DirEntry[] = [];
        const subdirs: Deno.DirEntry[] = [];

        for await (const fileEntry of Deno.readDir(itemDir)) {
          if (fileEntry.name.startsWith(".")) continue;
          if (fileEntry.isDirectory) {
            subdirs.push(fileEntry);
          } else if (fileEntry.isFile) {
            if (fileEntry.name.toLowerCase().endsWith(".pdf")) {
              if (!pdfEntry) pdfEntry = fileEntry;
            } else {
              nonPdfs.push(fileEntry);
            }
          }
        }

        if (!pdfEntry) continue;
        
        const urlPrefix = `assets/pub/${year}/${itemName}/`;

        async function getAssetsTree(subDir: string, subUrlPrefix: string, upUrl: string): Promise<PublicationDataNode[]> {
          const nodes: PublicationDataNode[] = [];
          for await (const entry of Deno.readDir(subDir)) {
            if (entry.name.startsWith(".")) continue;
            if (entry.isFile) {
              const stat = await Deno.stat(`${subDir}/${entry.name}`);
              nodes.push({
                type: "file",
                name: entry.name,
                url: `/${subUrlPrefix}${entry.name}`,
                sizeStr: formatBytes(stat.size),
              });
            } else if (entry.isDirectory) {
              const nodeUrl = `/${subUrlPrefix}${entry.name}/`;
              const children = await getAssetsTree(`${subDir}/${entry.name}`, `${subUrlPrefix}${entry.name}/`, nodeUrl);
              const dirNode: PublicationDataNode = {
                type: "dir",
                name: entry.name,
                url: nodeUrl,
                children,
              };
              nodes.push(dirNode);
              dirPagesToGenerate.push({
                url: nodeUrl,
                name: entry.name,
                children,
                parentUrl: upUrl
              });
            }
          }
          nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          return nodes;
        }

        const dataNodes: PublicationDataNode[] = [];

        for (const other of nonPdfs) {
          const stat = await Deno.stat(`${itemDir}/${other.name}`);
          dataNodes.push({
            type: "file",
            name: other.name,
            url: `/${urlPrefix}${other.name}`,
            sizeStr: formatBytes(stat.size),
          });
        }

        for (const sub of subdirs) {
          const nodeUrl = `/${urlPrefix}${sub.name}/`;
          const children = await getAssetsTree(`${itemDir}/${sub.name}`, `${urlPrefix}${sub.name}/`, nodeUrl);
          const dirNode: PublicationDataNode = {
            type: "dir",
            name: sub.name,
            url: nodeUrl,
            children,
          };
          dataNodes.push(dirNode);
          dirPagesToGenerate.push({
            url: nodeUrl,
            name: sub.name,
            children,
            parentUrl: `/publications/` 
          });
        }

        dataNodes.sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        const dataHtml = dataNodes.length > 0 ? renderDataNodes(dataNodes) : "";

        const entryPath = `${itemDir}/${pdfEntry.name}`;
        const title = pdfEntry.name.replace(/\.pdf$/i, "");
        const stat = await Deno.stat(entryPath);
        const mtime = stat.mtime ? stat.mtime.toISOString().slice(0, 10) : "";

        const metaParts: string[] = [];
        metaParts.push(`归档：${year}/${itemName}`);
        if (mtime) metaParts.push(`更新：${mtime}`);
        metaParts.push(`PDF · ${formatBytes(stat.size)}`);

        items.push({
          year,
          title,
          url: `/${urlPrefix}${pdfEntry.name}`,
          meta: metaParts.join(" · "),
          dataHtml,
          sortKey: `${year}/${itemName}/${pdfEntry.name}`.toLowerCase(),
        });
      }
    }
  } catch (e) {
    console.error(e);
    return [];
  }

  const groups = new Map<string, PublicationItem[]>();
  for (const item of items) {
    const { year, sortKey: _sortKey, ...publicItem } = item;
    const list = groups.get(year) ?? [];
    list.push(publicItem);
    groups.set(year, list);
  }

  const years = [...groups.keys()].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aNum = Number.isFinite(na);
    const bNum = Number.isFinite(nb);
    if (aNum && bNum) return nb - na;
    if (aNum) return -1;
    if (bNum) return 1;
    return b.localeCompare(a, "zh-CN");
  });

  return years.map((year) => {
    const yearItems = groups.get(year) ?? [];
    yearItems.sort((a, b) => a.url.localeCompare(b.url, "en"));
    return { year, items: yearItems };
  });
}

for (const [key, value] of Object.entries(data)) {
  site.data(key, value);
}
site.data("publications", await collectPublications("assets/pub"));

site.addEventListener("afterBuild", async () => {
    for (const page of dirPagesToGenerate) {
       const htmlPath = `_site${page.url}index.html`;
       const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>附件目录：${page.name} | 聚核智算 FUSIM</title>
  <link rel="stylesheet" href="/assets/css/styles.css">
  <style>
    body { padding: 4rem 2rem; max-width: 800px; margin: 0 auto; background: var(--bg-body, #fff); color: var(--text-body, #333); font-family: sans-serif; }
    .back-link { display: inline-block; margin-bottom: 2rem; color: var(--color-primary, #0056b3); text-decoration: none; font-weight: 500; }
    .back-link:hover { text-decoration: underline; }
    .card { background: var(--bg-card, #f9f9f9); border-radius: 8px; padding: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    details { margin-top: 0.5rem; }
    a { color: var(--color-primary, #0056b3); }
  </style>
</head>
<body>
  <h1>📁 ${page.name}</h1>
  <a class="back-link" href="${page.parentUrl}">🔙 返回上一级或原文</a>
  <div class="card">
    ${renderDataNodes(page.children)}
  </div>
</body>
</html>`;
       try {
           await Deno.mkdir(`_site${page.url}`, { recursive: true });
           await Deno.writeTextFile(htmlPath, htmlContent);
       } catch(e) {
           console.error("生成附件目录页面失败:", page.url, e);
       }
    }
});

site.use(icons({
  catalogs: [
    {
      id: "lucide",
      src:
        "https://cdn.jsdelivr.net/npm/lucide-static@0.554.0/icons/{name}.svg",
    },
  ],
}));
site.use(prism());
site.use(date());
site.use(remark());
site.use(katex());
site.use(postcss({
  includes: "./assets/css/",
  plugins: [cssnano()],
}));
site.ignore("AGENTS.md", "CLAUDE.md", "README.md", "docs/plans");
site.copy("assets");

export default site;

