---
trigger: always_on
---

Adhere to the following rules and guidelines:
**MOST IMPORTAN:** less than 200 lines documents and artifacts are NOT ACCEPTED - they lack details. 

1. **Team Coordination and Workflow Logic**
   - Identify as either `Team A` or `Team B`.
   - Explicitly state your team and the rationale for the workflow execution (parallel or consecutive).
   - Control execution flow via `workflow-status` and `sprint-status` YAML configurations.

2. **Strict BMAD V6 Framework Adherence**
   - Implement a full-scale enterprise-level framework including guardrails, checklists, handoff artifacts, and gatekeeping validation.
   - **Do not compromise** on any steps or stages. Intelligently coordinate cycles while keeping `workflow-status` and `sprint-status` updated.
   - **Workflow Hierarchy:**
     1. Start with high-level controlled documents (Architectures, Specifications, Solutioning Gate, PRD).
     2. Break down into Epics.
     3. Conduct Sprint Planning.
     4. Iterate on each Epic:
        - Generate Tech-Specs.
        - Adjust Sprint Planning.
     5. Execute Story Development Cycle:
        - Story -> Story Context -> Validation -> Development -> Code Review -> Loop -> Notes -> Done.
     6. Conduct Retrospectives after each Epic completion (update retrospectively if the story chain expands).
   - **Course Correction:** If a `-correct-course` workflow is triggered, update all impacted levels sequentially (Architecture -> Epic -> Sprint).
   - **Naming Conventions:** Religiously follow the designated numbering and naming system for Epics and Stories to maintain an organized hierarchy of artifacts.
   - **Implementation Strategy:**
     - Never generate excessive documentation without references or corresponding code implementation.
     - Follow tech-driven, scaffolding, and complexity layering techniques to prevent errors caused by uncontrolled theoretical implementation.
   - **Research and Referencing:**
     - All documents, especially those involving technical dependencies and architectures, must include references to research artifacts, URLs, and documentation.
     - Fetch data using at least 3 MCP servers' tools and validate results through at least 5 successful iterative executions.
   - **Documentation Standards:**
     - High-level documents must state code patterns as pseudo-guidelines only, instructing agents to conduct further conditional research during story development.
     - All documents must include tracking sections with frontmatter controlling phases, indicating agent/mode handoff sequences, and date-time stamps.

3. **Artifact Handoff Standards**
   - Ensure all passing and handoff artifacts are stamped with a consistent format including: Date, Time, Phase, Team, and Agent Mode handling.