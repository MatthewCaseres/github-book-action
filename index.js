const core = require("@actions/core");
const github = require("@actions/github");
const { summaryToUrlTree } = require("github-books");
const GithubSlugger = require("github-slugger");
const markdown = require('remark-stringify');
const unified = require('unified')
const { writeFileSync } = require("fs");
const visit = require('unist-util-visit');

const slugger = new GithubSlugger();
let allHeaders = [];
let allFiles = [];
const headersFunction = ({ mdast, file }) => {
  const headers = [];
  for (let node of mdast.children) {
    if (node.type === "heading" && (node.depth === 1 || node.depth === 2)) {
      const depth = node.depth;
      const title = node.children[0].value;
      const slug = slugger.slug(title);
      headers.push({ depth, title, slug });
    }
  }
  visit(mdast, 'image', (node) => {
    node.url = `./source/${node.url.slice(2)}`
  })
  
  allHeaders = [...allHeaders, ...headers];
  allFiles = [...allFiles, unified().use(markdown).stringify(mdast)];
};

main().catch((error) => core.setFailed(error.message));
async function main() {
  try {
    const configPath = core.getInput("configPath");
    const bookTree = await summaryToUrlTree({
      url: "dummyURL",
      localPath: 
      // configPath,
        "./source/00-index.md",
        // "/Users/matthewcaseres/Documents/GitHub/AWS-Notes/source/00-index.md",
      userFunction: headersFunction,
    });
    const title = `# ${bookTree.title} \n\n`;
    let slicedHeaders = [];
    let beginIndex = 0;
    for (i = 1; i < allHeaders.length; i++) {
      if (allHeaders[i].depth === 1 || i == allHeaders.length - 1) {
        slicedHeaders.push(allHeaders.slice(beginIndex, i));
        beginIndex = i;
      }
    }
    const TOC = slicedHeaders.map((section) => `<details>
  <summary><a href="#${section[0].slug}">${section[0].title}</a></summary>
    
${section.slice(1).map((header) => `* [${header.title}](#${header.slug})`).join("\n")}
</details>` + "\n\n").join("")

    const outputPath = core.getInput("outputPath");
    const beforeTOC = core.getInput("beforeTOC");
    writeFileSync('README.md', title + TOC + "\n" + allFiles.join("\r\n"));
  } catch (error) {
    core.setFailed(error.message);
  }
}
