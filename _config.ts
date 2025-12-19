import lume from "lume/mod.ts";
import remark from "lume/plugins/remark.ts";
import prism from "lume/plugins/prism.ts";
import katex from "lume/plugins/katex.ts";
import date from "lume/plugins/date.ts";
import postcss from "lume/plugins/postcss.ts";
import icons from "lume/plugins/icons.ts";

import cssnano from "npm:cssnano@7.1.2"; 
const site = lume();

site.data("slogan","打造新一代聚变仿真工业软件")
site.data("slogan_2","探索聚变仿真软件，为实现终极能源赋能")
site.data("description","聚核智算（FUSIM）是一家聚变等离子体软件SaaS服务商，致力于为科研机构和企业提供高效、精准的仿真解决方案，推动聚变能源技术的发展。")
site.data("icp","鄂ICP备2025165543号-1")
site.data("email","admin@fusim.cn")
site.use(icons({
    catalogs:[
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
    includes: "./assets/",
    plugins: [cssnano()] 
}));
site.ignore("AGENTS.md", "CLAUDE.md", "README.md");
site.copy("assets");

export default site;
