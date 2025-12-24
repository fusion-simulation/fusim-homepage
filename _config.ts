import lume from "lume/mod.ts";
import remark from "lume/plugins/remark.ts";
import prism from "lume/plugins/prism.ts";
import katex from "lume/plugins/katex.ts";
import date from "lume/plugins/date.ts";
import postcss from "lume/plugins/postcss.ts";
import icons from "lume/plugins/icons.ts";

import cssnano from "npm:cssnano@7.1.2";
const site = lume();

type PublicationItem = {
  url: string;
  title: string;
  meta: string;
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

async function collectPublications(
  root: string,
): Promise<PublicationGroup[]> {
  const items: Array<PublicationItem & { year: string; sortKey: string }> = [];

  async function walk(dir: string, relParts: string[]): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.name.startsWith(".")) continue;
      const entryPath = `${dir}/${entry.name}`;
      if (entry.isDirectory) {
        await walk(entryPath, [...relParts, entry.name]);
        continue;
      }
      if (!entry.isFile) continue;
      if (!entry.name.toLowerCase().endsWith(".pdf")) continue;

      const year = relParts[0] ?? "其他";
      const relDir = relParts.slice(1).join("/");
      const title = entry.name.replace(/\.pdf$/i, "");
      const stat = await Deno.stat(entryPath);
      const mtime = stat.mtime ? stat.mtime.toISOString().slice(0, 10) : "";

      const metaParts: string[] = [];
      if (relDir) metaParts.push(`归档：${relDir}`);
      if (mtime) metaParts.push(`更新：${mtime}`);
      metaParts.push(`PDF · ${formatBytes(stat.size)}`);

      const urlParts = relParts.length ? `${relParts.join("/")}/` : "";
      items.push({
        year,
        title,
        url: `/assets/pub/${urlParts}${entry.name}`,
        meta: metaParts.join(" · "),
        sortKey: `${year}/${urlParts}${entry.name}`.toLowerCase(),
      });
    }
  }

  try {
    await walk(root, []);
  } catch {
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

site.data("slogan", "打造新一代聚变仿真工业软件")
site.data("slogan_2", "探索聚变仿真软件，为实现终极能源赋能")
site.data("description", "聚核智算（FUSIM）是一家聚变等离子体软件SaaS服务商，致力于为科研机构和企业提供高效、精准的仿真解决方案，推动聚变能源技术的发展。")
site.data("icp", "鄂ICP备2025165543号-1")
site.data("mps", "鄂公网安备42018502008408号")
site.data("email", "info@fusim.cn")
site.data("publications", await collectPublications("assets/pub"));
site.use(icons({
    catalogs: [
        {
            id: "lucide",
            src: "https://cdn.jsdelivr.net/npm/lucide-static@0.554.0/icons/{name}.svg"
        }]
}));
site.use(prism());
site.use(date());
site.use(remark());
site.use(katex());
site.use(postcss({
    includes: "./assets/css/",
    plugins: [cssnano()]
}));
site.ignore("AGENTS.md", "CLAUDE.md", "README.md");
site.copy("assets");

export default site;
