# Step Skill: 03-create-context

> **Master Source**: `_bmad/bmb/workflows/story-cycle/steps/03-create-context.md` | **Step**: 3/9

---

## Trigger

```
create-context
/create-context
create context
build context
```

---

## Parameters

```
story={story_key}    # Story key (required)
```

---

## description

Build context XML file with all relevant code snippets, architecture patterns, and implementation hints. Story Manager (SM) agent responsibility.

---

## Master Workflow Reference

**Full Instructions**: `_bmad/bmb/workflows/story-cycle/steps/03-create-context.md`

**Context Components:**
1. Story metadata (from story file)
2. Architecture patterns (from architecture.md)
3. Related code snippets (from referenced files)
4. API contracts (from API documentation)
5. Dependency trees (from codebase analysis)

---

## Context XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<story-context>
  <metadata>
    <story_key>{epic}-{story}-{slug}</story_key>
    <title>{title}</title>
    <agent>{assigned_agent}</agent>
    <created_at>{timestamp}</created_at>
  </metadata>

  <architecture>
    <!-- Architecture patterns and decisions -->
    <pattern name="clean-architecture">
      <description>Four-layer architecture pattern</description>
      <layers>
        <layer name="presentation">UI Components</layer>
        <layer name="application">React Hooks + Services</layer>
        <layer name="domain">Business Logic</layer>
        <layer name="infrastructure">Persistence + Events</layer>
      </layers>
    </pattern>
  </architecture>

  <files>
    <!-- Relevant code snippets -->
    <file path="src/lib/example.ts" type="reference">
      <code>
        // Code snippet from file
      </code>
    </file>
  </files>

  <apis>
    <!-- API contracts -->
    <api name="exampleFunction">
      <signature>function example(param: Type): Promise<Result></signature>
      <description>description of the function</description>
    </api>
  </apis>

  <dependencies>
    <!-- Dependency tree -->
    <dependency path="src/lib/a.ts" depends_on="src/lib/b.ts, src/lib/c.ts"/>
  </dependencies>

  <references>
    <!-- Additional references -->
    <reference type="adr" id="024">State Management Consolidation</reference>
  </references>
</story-context>
```

---

## Output

- **Context File**: `{sprint_artifacts}/{story_key}-context.xml`
- **Next Step**: `04-validate-context.md`

---

**See Also**: `02-validate-story`, `04-validate-context`
