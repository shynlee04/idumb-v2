TLDR: good tools are always picked as they are needed by any agents (no need of custom made nor manipulate any other techniques. Vs Worst tools: struggle to make their ways in even with splitting, enforcing in to focus group and agent profile → they are sometimes picked but once used are struggled by agents of all sorts of trouble by logics, by choices, by making complex arguments that they  have no long-term memory to access. 

## Points of consideration from our knowledge as for the current needs of which tools → pre-assess them following these points:

### Locations of tools, the structure, and they can be a tool with multiple ones as export:

```markdown
Location
They can be defined:

Locally by placing them in the .opencode/tools/ directory of your project.
Or globally, by placing them in ~/.config/opencode/tools/.
Structure
The easiest way to create tools is using the tool() helper which provides type-safety and validation.

.opencode/tools/database.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Query the project database",
  args: {
    query: tool.schema.string().describe("SQL query to execute"),
  },
  async execute(args) {
    // Your database logic here
    return `Executed query: ${args.query}`
  },
})

The filename becomes the tool name. The above creates a database tool.

Multiple tools per file
You can also export multiple tools from a single file. Each export becomes a separate tool with the name <filename>_<exportname>:

.opencode/tools/math.ts
import { tool } from "@opencode-ai/plugin"

export const add = tool({
  description: "Add two numbers",
  args: {
    a: tool.schema.number().describe("First number"),
    b: tool.schema.number().describe("Second number"),
  },
  async execute(args) {
    return args.a + args.b
  },
})

export const multiply = tool({
  description: "Multiply two numbers",
  args: {
    a: tool.schema.number().describe("First number"),
    b: tool.schema.number().describe("Second number"),
  },
  async execute(args) {
    return args.a * args.b
  },
})

This creates two tools: math_add and math_multiply.
```

 

### Tools arguments with zod

```markdown

Arguments
You can use tool.schema, which is just Zod, to define argument types.

args: {
  query: tool.schema.string().describe("SQL query to execute")
}

You can also import Zod directly and return a plain object:

import { z } from "zod"

export default {
  description: "Tool description",
  args: {
    param: z.string().describe("Parameter description"),
  },
  async execute(args, context) {
    // Tool implementation
    return "result"
  },
}

.worktree for the git worktree root.

Examples
Write a tool in Python
You can write your tools in any language you want. Here’s an example that adds two numbers using Python.

First, create the tool as a Python script:

.opencode/tools/add.py
import sys

a = int(sys.argv[1])
b = int(sys.argv[2])
print(a + b)

Then create the tool definition that invokes it:

.opencode/tools/python-add.ts
import { tool } from "@opencode-ai/plugin"
import path from "path"

export default tool({
  description: "Add two numbers using Python",
  args: {
    a: tool.schema.number().describe("First number"),
    b: tool.schema.number().describe("Second number"),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/tools/add.py")
    const result = await Bun.$`python3 ${script} ${args.a} ${args.b}`.text()
    return result.trim()
  },
})

Here we are using the Bun.$ utility to run the Python script.

```

### Tools that receive context

```markdown
Context
Tools receive context about the current session:

.opencode/tools/project.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Get project information",
  args: {},
  async execute(args, context) {
    // Access context information
    const { agent, sessionID, messageID, directory, worktree } = context
    return `Agent: ${agent}, Session: ${sessionID}, Message: ${messageID}, Directory: ${directory}, Worktree: ${worktree}`
  },
})

Use context.directory for the session working directory. Use context
```

### tools can be written in other languages and can include sets of scripts when activates

Tools are defined as **TypeScript** or **JavaScript** files. However, the tool definition can invoke scripts written in **any language** — TypeScript or JavaScript is only used for the tool definition itself.

---

### As there are many points that raise very true nature that tools should never be shallow and made without thoughts - be a thinker (walk the agents and the use cases to make them better with these questions)

1. Are the tools make no hassle into the choice of ai agents and these custom-made tools can expose to all agents as for when they need to pick each and use without any shadowing techniques in tools’ descriptions (this is an enhancement for technique of writing good description)  → this defines the distinct uses also the superiority over other tools  and because Ai agent is smart they can automatically pick ones when they need.
2. Are the tools made just for a few specific use cases, or many of them with high frequency → if the latter then they are well made
3. Are the tools make no conflict to other tools ; how about their mechanism over the rest of other concepts any too many cumbersome conditions need to meet before tools can be executed; are the, overlapping solutions else where.
4. Are tools causing too much trouble when agents use them (for too many requirements of fields) → and how about they want to use it mid run are the tools still allow them to get used
5. Are the tools are well designed in granularity and use case-specific with routing and combinations 
6. are they linked well and harmonize with the rest of our concepts
7. Are we replacing the innate tools → are the efficiency better? → if yes, then if we rip the context of the project off  the reason to use are they still valid uses ; are the validation weights. 

### From tools that receive context, loaded with script and other tools → to think about there are still tons of other SDK uses when use with tools can make different than the clumsiness that is handling with many dumb-founded decisions of block, context noise from tools junks (meaningless output) and exporting of contextless exports

```markdown
Global
Method	Description	Response
global.health()	Check server health and version	{ healthy: true, version: string }
Examples
const health = await client.global.health()
console.log(health.data.version)

App
Method	Description	Response
app.log()	Write a log entry	boolean
app.agents()	List all available agents	Agent[]
Examples
// Write a log entry
await client.app.log({
  body: {
    service: "my-app",
    level: "info",
    message: "Operation completed",
  },
})

// List available agents
const agents = await client.app.agents()

Project
Method	Description	Response
project.list()	List all projects	Project[]
project.current()	Get current project	Project
Examples
// List all projects
const projects = await client.project.list()

// Get current project
const currentProject = await client.project.current()

Path
Method	Description	Response
path.get()	Get current path	Path
Examples
// Get current path information
const pathInfo = await client.path.get()

Config
Method	Description	Response
config.get()	Get config info	Config
config.providers()	List providers and default models	{ providers: Provider[], default: { [key: string]: string } }
Examples
const config = await client.config.get()

const { providers, default: defaults } = await client.config.providers()

Sessions
Method	Description	Notes
session.list()	List sessions	Returns Session[]
session.get({ path })	Get session	Returns Session
session.children({ path })	List child sessions	Returns Session[]
session.create({ body })	Create session	Returns Session
session.delete({ path })	Delete session	Returns boolean
session.update({ path, body })	Update session properties	Returns Session
session.init({ path, body })	Analyze app and create AGENTS.md	Returns boolean
session.abort({ path })	Abort a running session	Returns boolean
session.share({ path })	Share session	Returns Session
session.unshare({ path })	Unshare session	Returns Session
session.summarize({ path, body })	Summarize session	Returns boolean
session.messages({ path })	List messages in a session	Returns { info: Message, parts: Part[]}[]
session.message({ path })	Get message details	Returns { info: Message, parts: Part[]}
session.prompt({ path, body })	Send prompt message	body.noReply: true returns UserMessage (context only). Default returns AssistantMessage with AI response
session.command({ path, body })	Send command to session	Returns { info: AssistantMessage, parts: Part[]}
session.shell({ path, body })	Run a shell command	Returns AssistantMessage
session.revert({ path, body })	Revert a message	Returns Session
session.unrevert({ path })	Restore reverted messages	Returns Session
postSessionByIdPermissionsByPermissionId({ path, body })	Respond to a permission request	Returns boolean
Examples
// Create and manage sessions
const session = await client.session.create({
  body: { title: "My session" },
})

const sessions = await client.session.list()

// Send a prompt message
const result = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: { providerID: "anthropic", modelID: "claude-3-5-sonnet-20241022" },
    parts: [{ type: "text", text: "Hello!" }],
  },
})

// Inject context without triggering AI response (useful for plugins)
await client.session.prompt({
  path: { id: session.id },
  body: {
    noReply: true,
    parts: [{ type: "text", text: "You are a helpful assistant." }],
  },
})

Files
Method	Description	Response
find.text({ query })	Search for text in files	Array of match objects with path, lines, line_number, absolute_offset, submatches
find.files({ query })	Find files and directories by name	string[] (paths)
find.symbols({ query })	Find workspace symbols	Symbol[]
file.read({ query })	Read a file	{ type: "raw" | "patch", content: string }
file.status({ query? })	Get status for tracked files	File[]
find.files supports a few optional query fields:

type: "file" or "directory"
directory: override the project root for the search
limit: max results (1–200)
Examples
// Search and read files
const textResults = await client.find.text({
  query: { pattern: "function.*opencode" },
})

const files = await client.find.files({
  query: { query: "*.ts", type: "file" },
})

const directories = await client.find.files({
  query: { query: "packages", type: "directory", limit: 20 },
})

const content = await client.file.read({
  query: { path: "src/index.ts" },
})

TUI
Method	Description	Response
tui.appendPrompt({ body })	Append text to the prompt	boolean
tui.openHelp()	Open the help dialog	boolean
tui.openSessions()	Open the session selector	boolean
tui.openThemes()	Open the theme selector	boolean
tui.openModels()	Open the model selector	boolean
tui.submitPrompt()	Submit the current prompt	boolean
tui.clearPrompt()	Clear the prompt	boolean
tui.executeCommand({ body })	Execute a command	boolean
tui.showToast({ body })	Show toast notification	boolean
Examples
// Control TUI interface
await client.tui.appendPrompt({
  body: { text: "Add this to prompt" },
})

await client.tui.showToast({
  body: { message: "Task completed", variant: "success" },
})
```

→ Ultrathink in order to get the greater picture as for these are points to many applications to make integration to the project before phase 9 is carried out (look at session, look at TUI and look at logging session

## Some ideas and packages may be useful for you when making tools

```markdown
When building AI agents tools for OpenCode are there any tools for: fast searching beside grep, glob, list, regex, for hop reading beside off-set what do we have. How about that similar type for target editing with precision beside search and replaced, I intend to make use of schematic-first approach for the purposes

For building schematic-first, type-safe, and client-side capable agents (especially relevant to your Vibe Coding and Tanstack focus), we need to move the agent's perception from "Text Processing" (strings/regex) to "Syntax Processing" (ASTs/CSTs).

Here are the specific tools that fit your criteria for the modern "OpenCode" ecosystem in 2026.

1. Fast Searching: Beyond grep & regex
The Goal: Search for "meaning," not just characters.

The Tool: ast-grep (sg) This is the current gold standard for schematic search. It uses Tree-sitter parsers to search the Abstract Syntax Tree (AST) rather than the raw text.

Why it fits you: It allows your agent to query code structure rather than text patterns.

How it works: Instead of regex function\s+\w+\(, you write a pattern like function $NAME($ARGS) { $$$ }.

Agent Capability: Give your agent a tool find_pattern that takes a schematic query.

Example: "Find all React components using useQuery."

sg Query: const $NAME = () => { ... useQuery(...) ... }

Client-Side: ast-grep has excellent WASM support, meaning you can run high-performance schematic searches directly in the browser (perfect for a client-side Tanstack Start app).

Runner Up: zoekt If you are indexing a massive local repo, zoekt (used by Sourcegraph) uses trigram indexing for instant results, but it is less "schematic" than ast-grep.

2. Hop Reading: Beyond offset & line_limit
The Goal: "Semantic hopping"—reading by symbol definition, not by byte chunk.

The Approach: LSP-based Symbol Navigation & Tree-sitter Slicing Standard agents read files in chunks (lines 1–100). A "schematic-first" agent should read by Symbol.

The Tool: Headless LSP (Language Server Protocol) Instead of a tool read_file(start_line, end_line), give your agent:

read_definition(symbol_name): Returns the code block for a specific function/class, regardless of where it is.

list_symbols(file_path): Returns a "skeleton" of the file (classes, methods, exports) without the implementation bodies. This drastically reduces token usage (context window) while allowing the agent to understand the shape of the file before diving in.

The Tool: stack-graphs (from GitHub) For precise "hopping" (Go-to-definition) without a running language server. It allows incremental graph construction to resolve references.

Use Case: Your agent sees import { Button } from './ui', and instantly "hops" to the Button definition in ui.tsx without needing to grep for the file.

3. Target Editing: Schematic-First Approach
The Goal: Precision editing without hallucinating indentation or closing braces.

The Tool: GritQL (Grit) If ast-grep is grep for ASTs, GritQL is SQL for code transformations. It is arguably the most powerful tool for "Target Editing with Precision."

Why it fits you: It uses a declarative query language to define state A and transform it to state B, preserving comments and formatting (fidelity).

Schematic-First Editing:

Instead of an agent outputting a diff or a whole file, the agent generates a GritQL query.

Example Agent Action: "Migrate all useState calls to a new hook."

Grit Pattern:

Code snippet
`useState($val)` => `useMyCustomHook($val)` where { ... }
Integration: It is written in Rust (fast) and has JS/WASM bindings, making it compatible with your node/browser-based agent architecture.

The Tool: Morph (by CodeMorph) A newer entrant focusing on "Intent-based" code modding. It allows you to define a transformation logic that the AI agent can invoke to safely refactor code structures (e.g., "Move this component to its own file and update all imports").

Summary of your "OpenCode" Toolkit
Action	Old School (Text)	Schematic-First (AST/Graph)	Client-Side/TS Ready?
Search	grep, ripgrep	ast-grep (sg)	✅ Yes (WASM)
Read	offset, read_lines	tree-sitter queries / LSP Symbols	✅ Yes (tree-sitter-wasm)
Edit	sed, replace()	GritQL	✅ Yes (WASM bindings)
Next Step
Would you like me to generate a Type-Safe Tool Definition (using Vercel AI SDK zod schemas) for an ast-grep search tool that you can drop directly into your Tanstack agent?

In fact I don't think nowadays, when AI writes mode codes, yet beside those tools are excellent at the job most coding platform comes at innate (like OpenCode with LSP). Nowadays, it's more like find "bullshit in comment logics" or parse heading of documents artifacts to spot hallucinations when requirements ids are made irrelevant by agents

This is a profound insight. You are observing the "Verification Phase" of the AI coding era.

When AI writes the code, the human's job shifts from authoring to auditing. We don't need tools to write faster; we need tools to read smarter and verify truth.

Standard grep cannot tell you if a comment is lying. LSP cannot tell you if a requirement ID is hallucinated.

Here is the "Bullshit Detection" stack for the schematic-first era, designed to catch "Knowledge Conflicting Hallucinations" (KCH) and "Requirement Drift."

1. The "Bullshit Detector" (Comment vs. Logic)
The Goal: Find where the comment promises X, but the code does Y.

The tool you are looking for is a Semantic Linter. This doesn't exist as a single binary yet, but you can build it easily using ast-grep (sg) combined with a lightweight local LLM (like qwen2.5-coder or gemini-flash).

The Workflow (Schematic Approach): Instead of reading the whole file, you "hop read" by extracting (Comment, Code) pairs.

Extract: Use ast-grep to grab every function that has a docstring.

Pattern: function $NAME(...) { $$$ } (filtered for attached comments).

Verify: Pass only the comment and the function signature/body to a small LLM with a specific prompt: "Does this code body fulfill the promise made in the comment? Yes/No."

Report: Flag code where the "semantic distance" is high.

Tool to use: Knip (Conceptual Cousin) While Knip primarily finds unused exports (dead code), it is the closest mainstream tool to "logic auditing." You can extend its plugins to audit dead logic (code that exists but isn't reachable or consistent with exports).

2. The "Traceability Guard" (Requirement ID Validation)
The Goal: Stop agents from hallucinating // Implements REQ-123 when REQ-123 doesn't exist or is irrelevant.

Agents love to hallucinate completion. They will see a file header with Requirements: [REQ-101] and blindly add REQ-102 to their new file because it "looks right."

The Tool: Repomix (formerly Repopack) + Custom AST Linter You need a "Context Bounding" tool.

Step 1: The Truth Source. Keep your requirements in a structured format (Markdown/Frontmatter).

docs/specs/auth.md: id: REQ-AUTH-01

Step 2: The "Hop Reader." Don't use regex to find IDs. Use a Schematic Scanner.

Scan: Look for // @req: ID or docblock tags.

Hop: Instantly query the "Truth Source" index.

Error: If the ID isn't in docs/specs/*.md, it is a hallucination.

Existing Tooling Match:

Use danger-js: It's a PR automation tool. You can script a rule: "If a PR touches code linked to REQ-01, but the PR body doesn't mention REQ-01, fail the build." This forces the "Requirement Traceability" you mentioned.

3. "Schematic-First" Target Editing (Precision Repair)
The Goal: Surgically remove the "bullshit" without rewriting the file.

If you find a hallucinated comment, you don't want an agent to rewrite the function (risking logic errors). You want a Schematic Patch.

The Tool: GritQL (The Scalpel)

Scenario: Your "Bullshit Detector" found that 50 files have a comment // TODO: Refactor this that was added by an agent 3 months ago and never touched.

The GritQL Fix:

Code snippet
// Find comments matching the pattern and delete ONLY the comment
`// TODO: Refactor this` => . 
Why this is better: It creates an AST transformation. It treats the comment as a node in the syntax tree and removes it, ensuring it doesn't accidentally delete the line of code below it if whitespace is weird.

Summary: The "Verification Stack"
Capability	The "Old Way"	The "Schematic/Agentic" Way
Logic Check	Code Review	ast-grep extraction + LLM Verification (The "Lying Comment" check)
Req Traceability	Manual Matrix	DangerJS / Custom Linter checking AST tags against docs/*.md
Drift Detection	git blame	Repomix (Generate a "context map" to see if code still matches the spec)
Recommendation for your OpenCode Agent
Since you are using OpenCode (which has grep, read, etc.), I suggest adding a Custom Tool called audit_spec.

Tool Definition (audit_spec):

Input: file_path

Action:

Parses the file using Tree-sitter.

Extracts all Requirement IDs (@req) and Docstrings.

Checks IDs against your local specs/ folder.

Returns a report: "File validates against REQ-101, but cites REQ-999 (Non-existent)."

This stops the agent from "hop reading" blindly and forces it to acknowledge the actual project state.

Can You tell me more about tools or where I can look for those typescript sets of tools that can be ready to parse and combine with my set, are there any expert advice on tools and plugins

design for OpenCode platform

To build a "Schematic-First" toolset for the OpenCode platform in 2026, you need to move beyond standard text manipulation and leverage the AST (Abstract Syntax Tree) and MCP (Model Context Protocol) standards.

Here is the specific TypeScript stack and expert design advice for your agent tools.

1. The "Schematic-First" TypeScript Stack (2026 Edition)
These are the libraries you should be npm installing right now. They are chosen for speed (Rust bindings) and Type-Safety.

Category	Tool / Library	Why it fits your "Vibe Coder" persona
Parsing & Search	@ast-grep/napi	The TypeScript binding for sg. It allows you to write schematic queries (e.g., find all useQuery calls without a specific key) in TS. much faster than raw regex.
Precision Editing	ts-morph	Do not use raw strings for editing. ts-morph wraps the TypeScript Compiler API. It allows you to safely rename symbols, add imports, or modify interfaces without breaking syntax.
Speed Parsing	oxc-parser	The "Oxford Calculator" suite. In 2026, this is the fastest JS/TS parser available (Rust-based). Use this if your agent needs to "scan" a massive monorepo in milliseconds to build a graph.
Context Packing	repomix	(Formerly Repopack). Use this library programmatically to "pack" relevant files into a token-optimized XML/Markdown block for your agent's context window.
Agent Framework	mastra	A TypeScript-native agent framework gaining traction in 2025/26. It integrates strictly with Vercel AI SDK but adds "Workflows" and "Memory" specifically for local-first TypeScript agents.
2. Expert Advice: Designing "OpenCode" Plugins
Since you are building for an OpenCode environment (likely supporting the Model Context Protocol - MCP), do not build isolated scripts. Build MCP Servers.

Design Pattern A: The "Semantic Guardrail" (Bullshit Detector)
Instead of a tool that just "reads code," build a tool that validates consistency.

Tool Name: verify_comment_drift

Logic:

Use ts-morph to extract a function's body and its docstring.

Send a prompt to a small, fast model (like Gemini Flash or local Llama): "Does the code below logically align with the comments above it? Return JSON { drift_score: 0-1, reason: ... }"

Agent Action: If drift > 0.7, the agent automatically flags it before writing new code.

Design Pattern B: The "Graph Hopper" (Navigation)
Standard agents "hop" by guessing file names. Your agent should hop by Symbol Graph.

Tool Name: find_references_schematic

Implementation:

Do not grep for "Button".

Use ts-morph's .findReferences() method.

Return: A list of exact locations (file + line) where that symbol is used.

Why: This prevents the agent from hallucinating that Button is used in Header.tsx when it's actually DesignSystemButton.

Design Pattern C: Traceability Enforcement
Tool Name: audit_requirements

Logic:

Parse all @req(ID) tags in your code using oxc-parser (super fast).

Load your requirements.yaml or specs.md.

Return: A "Compliance Matrix" showing which requirements have zero code implementation and which code implements non-existent requirements.

3. Quick Start: Your package.json
To get started, your dependencies should look like this to support the "Schematic-First" approach:

JSON
{
  "dependencies": {
    "ts-morph": "^25.0.0",           // For safe editing
    "@ast-grep/napi": "^0.30.0",     // For schematic search
    "@modelcontextprotocol/sdk": "^1.0.0", // To make your tools universal
    "zod": "^3.24.0",                // For type-safe tool inputs
    "repomix": "latest"              // For packing context
  }
}
Next Step
The most powerful move right now is to standardize your tools.

Would you like me to generate the TypeScript code for an MCP Server that implements the verify_comment_drift tool using ts-morph? This would allow you to "install" this capability into any agent that speaks MCP.

[Workshop] AI Pipelines and Agents in Pure TypeScript with Mastra.ai — Nick Nisi, Zack Proser

This video is highly relevant as it demonstrates Mastra.ai, a 2025/2026 era framework specifically designed for building TypeScript-native AI agents and workflows, directly matching your tech stack and "OpenCode" integration needs.

```