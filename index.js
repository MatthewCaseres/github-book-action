const core = require("@actions/core");
const { summaryToUrlTree } = require("github-books");
const GithubSlugger = require("github-slugger");
const markdown = require("remark-stringify");
const unified = require("unified");
const { writeFileSync } = require("fs");
const visit = require("unist-util-visit");
const yaml = require("js-yaml");

const slugger = new GithubSlugger();
let allHeaders = [];
let allFiles = [];
let allProblems = {};
// Create table of contents AND concatenate files
const headersFunction = ({ mdast, treeNode }) => {
  const route = treeNode.title;
  const headers = [];
  for (let node of mdast.children) {
    if (node.type === "heading" && (node.depth === 1 || node.depth === 2)) {
      const depth = node.depth;
      const title = node.children[0].value;
      const slug = slugger.slug(title);
      headers.push({ depth, title, slug });
    }
  }
  visit(mdast, "image", (node) => {
    node.url = `./source/${node.url.slice(2)}`;
  });
  visit(mdast, "code", (node) => {
    if (node.lang === "mcq") {
      const mcqJSON = yaml.load(node.value, { schema: yaml.JSON_SCHEMA });
      node.type = "html";
      node.value = getMCQMarkdown(mcqJSON);
      allProblems[route] = [...(allProblems[route] || []), mcqJSON];
    }
  });
  visit(mdast, "link", (node) => {
    if (node.url.startsWith("https://www.youtube.com/watch?v=")) {
      node.children = [
        {
          type: "image",
          title: null,
          url: "./source/images/YouTube.svg",
          alt: "YouTube Logo",
        },
      ];
    }
  });
  allHeaders = [...allHeaders, ...headers];
  allFiles = [...allFiles, unified().use(markdown).stringify(mdast)];
};

main().catch((error) => core.setFailed(error.message));
async function main() {
  try {
    const bookTree = await summaryToUrlTree({
      url: "dummyURL",
      localPath: "./source/00-index.md",
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
    const TOC = slicedHeaders
      .map(
        (section) =>
          `<details>
  <summary><a href="#${section[0].slug}">${section[0].title}</a></summary>
    
${section
  .slice(1)
  .map((header) => `* [${header.title}](#${header.slug})`)
  .join("\n")}
</details>` + "\n\n"
      )
      .join("");

    writeFileSync("README.md", title + TOC + "\n" + allFiles.join("\r\n"));
    writeFileSync("problems.yaml", yaml.dump(allProblems));
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getCheckedAnswers(correct_idx, answers, solutionVisible) {
  if (typeof correct_idx === "number") {
    correct_idx = [correct_idx];
  }
  // If an answer is correct and solution is visible, fill it in
  return answers
    .map(
      (answer, i) =>
        `* [${
          correct_idx.includes(i) && solutionVisible ? "X" : " "
        }] ${answer}`
    )
    .join("\n");
}
function getMCQMarkdown({ prompt, correct_idx, answers, solution }) {
  return (
    "\n<hr /> \n\n" +
    prompt +
    "\n\n" +
    getCheckedAnswers(correct_idx, answers, false) +
    "\n\n" +
    "<details><summary><b>solution</b></summary>" +
    "\n\n" +
    getCheckedAnswers(correct_idx, answers, true) +
    "\n\n" +
    solution +
    "\n\n</details><hr /> \n\n"
  );
}
