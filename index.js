const core = require('@actions/core');
const github = require('@actions/github');
const {summaryToUrlTree, UserFunction} = require('github-books')
const GithubSlugger = require('github-slugger')
const {writeFile} = require('fs');
const {promisify} = require('util');
const writeFileAsync = promisify(writeFile)

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
    const bookTree = await summaryToUrlTree({
      url: "dummyURL",
      localPath:
        "./source/00-index.md",
      userFunction: headersFunction,
    });
    const nameToGreet = core.getInput('who-to-greet');
    console.log(`Hello ${nameToGreet}!`);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    await writeFileAsync('lol.json', JSON.stringify(bookTree))
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}