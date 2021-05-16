const core = require("@actions/core");
const github = require("@actions/github");
const { summaryToUrlTree, UserFunction } = require("github-books");
const GithubSlugger = require("github-slugger");
const { writeFile, writeFileSync } = require("fs");
const { promisify } = require("util");
const writeFileAsync = promisify(writeFile);

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
  allHeaders = [...allHeaders, ...headers];
  allFiles = [...allFiles, file];
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
    const TOC = slicedHeaders.map(section => `<details>
  <summary>${section[0].title}</summary>
    
${section.map((header) => `* [${header.title}](#${header.slug})`).join("\n")}
</details>` + "\n\n").join("")

    const outputPath = core.getInput("outputPath");
    const beforeTOC = core.getInput("beforeTOC");
    writeFileSync(outputPath, title + TOC + "\n" + allFiles.join("\r\n"));

    const nameToGreet = core.getInput("who-to-greet");
    console.log(`Hello ${nameToGreet}!`);
    const time = new Date().toTimeString();
    core.setOutput("time", time);
    await writeFileAsync("lol.json", JSON.stringify(bookTree));
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The event payload: ${payload}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}
