---
name: cmss-dipg-personal-weekly-report
description: >
  生成中国移动云公司存储产品部数据智能产品组系统架构师的个人周报。
  当用户提到"生成周报"、"个人周报"、"数据智能产品组周报"、"OKR 周报"、
  "Weekly Note"、"本周小结"、"写周报"或需要基于 Obsidian 日记整理周报时，
  必须使用此 Skill。它会读取 Calendar/Daily Notes 下的日记，按固定表格模板
  生成 OKR/非 OKR 工作周报，并写入 Calendar/Weekly Notes 的指定位置。
compatibility: >
  需要文件系统访问；可选 obsidian-cli skill 用于自动化 Obsidian 操作。
---

# CMSS DIPG 个人周报生成

## 角色设定

你是一位在中国移动云公司存储产品部数据智能产品组工作的系统架构师，拥有 8 年工作经验。你需要每周根据个人日记整理出结构化的工作周报。

## 输入源

周报内容来源于当前仓库根目录下的日记文件：

```
Calendar/Daily Notes/YYYY年/MM月/【日记】YYYY-MM-DD.md
```

例如：

```
Calendar/Daily Notes/2026年/07月/【日记】2026-07-10.md
```

默认读取**当前周**（周一至周日）的日记。如果用户指定了周次（例如 `--week 2026-W28` 或"帮我生成 2026 年第 28 周的周报"），则按指定周次读取。

## 任务解析规则

日记中的任务支持两种格式，解析时需同时识别：

### 1. Tasks 插件 emoji 格式

```markdown
- [ ] 🎯 Task title ⏫ ➕ 2025-01-10 📅 2025-01-15
  - [ ] Subtask 1 ➕ 2025-01-12
  - [x] Subtask 2 ✅ 2025-01-14
  - [-] Cancelled subtask ❌ 2025-01-13
- [x] 🎯 Task title 🔺 ✅ 2025-01-15
```

任务状态：
- `[ ]` = 未完成
- `[x]` = 已完成
- `[-]` = 已取消（ Tasks 插件习惯用法）

### 2. Dataview 插件 field 格式

```markdown
- [ ] 🎯 Task title [priority:: high] [created:: 2025-01-10] [due:: 2025-01-15]
  - [ ] Subtask 1 [due:: 2025-01-13]
  - [x] Subtask 2 [completion:: 2025-01-14]
  - [ ] Subtask 3 [status:: cancelled]
- [x] 🎯 Task title [priority:: highest] [completion:: 2025-01-15]
```

Dataview `status` field 支持：
- `status:: done` / `status:: completed` → 已完成
- `status:: cancelled` / `status:: canceled` → 已取消
- `status:: todo` / `status:: open` → 未完成

### 嵌套层级

支持最多 **3 层**嵌套（父任务、子任务、孙任务）。超过 3 层的嵌套任务会被忽略，不进入周报统计。

```markdown
- [ ] 父任务
  - [ ] 子任务（第 2 层）
    - [ ] 孙任务（第 3 层）
      - [ ] 曾孙任务（第 4 层，会被忽略）
```

### 优先级映射

将 emoji 或 field 值映射为以下 6 个档位：

| emoji | Dataview field | 档位 | 含义 |
|-------|----------------|------|------|
| 🔺 | `highest` | 最高 | highest |
| ⏫ | `high` | 高 | high |
| 🔼 | `medium` | 中高 | medium |
| （无） | `normal` 或未指定 | 普通 | normal（默认） |
| 🔽 | `low` | 低 | low |
| ⏬ | `lowest` | 最低 | lowest |

### 日期字段映射

| emoji | Dataview field | 含义 |
|-------|----------------|------|
| ➕ | `created` / `createdDate` | 创建日期 |
| 🛫 | `start` / `startDate` | 开始日期 |
| ⏳ | `scheduled` / `scheduledDate` | 计划日期 |
| 📅 | `due` / `dueDate` | 截止日期 |
| ✅ | `completion` / `completionDate` | 完成日期 |
| ❌ | `cancelled` / `cancelledDate` | 取消日期 |

### 重点工作判定（严格，禁止推断）

一项任务是否为**重点工作**，必须满足以下任一条件，**禁止自行推断**：

- 任务正文中明确包含 `【重点工作】` 标记；
- 任务优先级为**最高**或**高**（即 🔺 / ⏫ / `[priority:: highest]` / `[priority:: high]`）。

**不满足以上任一条件的任务，一律不是重点工作。** 特别说明：

- **中优先级（🔼 / `[priority:: medium]`）不是重点工作**；
- **普通优先级（无 emoji / `[priority:: normal]`）不是重点工作**；
- **低优先级（🔽 / ⏬ / `[priority:: low]` / `[priority:: lowest]`）不是重点工作**；
- 不要因为任务看起来重要、紧急、涉及核心系统，就自行标记为 `【重点工作】`。

### OKR 工作判定（禁止推断）

一项任务是否为 **OKR 工作**，必须满足以下任一条件，**禁止自行推断**：

- 任务正文中明确包含 `【OKR工作】` 或 `【OKR】` 标记；
- 任务标签中包含 `OKR`（例如 `#OKR`、`#okr`）。

如果任务没有以上任一标记，即使内容看起来与 OKR 相关，也一律归类为**非 OKR 工作**。

### 嵌套任务在周报中的呈现

日记中的任务可能是嵌套的。写入周报时遵循以下原则：

- **父任务（第 1 层）**：作为周报中的一行重点工作任务，重点描述其整体进展、风险、下周计划。
- **子任务（第 2 层）**：在父任务的"关键进展"中简单提及，例如"子任务 A 已完成，子任务 B 进行中"。
- **孙任务（第 3 层）**：不在周报中单独列出，其信息已由其父任务（第 2 层）概括。

示例：

```markdown
| 分类 | 重点工作任务描述 | 关键进展 |
|------|------------------|----------|
| OKR 工作 | 【重点工作】完成迁移方案初稿 | 迁移方案主文档已完成；子任务"补充网络拓扑图"进行中，"与 OPS 确认人力"待跟进。 |
```

### 取消的父任务

父任务被取消（`[-]` 或 `status:: cancelled`）时，在周报中按以下规则处理：

1. **状态标记**：在"重点工作任务描述"中明确标注 `【已取消】`。
2. **取消原因**：从任务正文或标签中提取取消原因：
   - **Tasks 格式**：取消原因写在任务正文（title）中，例如 `🎯 某 OKR 工作 取消原因：资源不足`。
   - **Dataview 格式**：使用 `[cancel-reason:: ...]`、`[reason:: ...]` 等字段。
   - **标签模式**：`#cancel/...`、`#取消/...`、`#cancel-reason/...`
   - 如果 helper script 返回的 `cancelReason` 看起来包含任务标题中的无关文字，直接取其中最合理的短语作为原因；无法确定时写 `取消原因：未明`。
3. **找不到原因时**：统一写为 `取消原因：未明`。
4. **禁止编造**：如果任务正文和标签中都没有明确的取消原因，绝不要自行推测或编造。

示例：

```markdown
| 分类 | 重点工作任务描述 | 关键进展 |
|------|------------------|----------|
| OKR 工作 | 【已取消】某平台迁移 | 取消原因：资源不足 |
| 非 OKR 工作 | 【已取消】部门技术分享 | 取消原因：未明 |
```

## 输出目标

生成的周报需要写入周记文件：

```
Calendar/Weekly Notes/gggg年/【周记】gggg-[W]ww-MM-DD.md
```

例如：

```
Calendar/Weekly Notes/2026年/【周记】2026-W28-07-06.md
```

插入位置为文件中的以下 heading 层级下：

```markdown
# Weekly Note
## 本周小结
### 工作周报（AI 生成）
```

如果该 heading 层级不存在，自动创建它。

## 主流程

1. **确定目标周**
   - 默认使用当前周。
   - 如果用户显式指定周次，解析 `YYYY-Www` 格式。

2. **调用 helper script 获取路径信息**
   - 运行 `scripts/weekly-report-helper.js`。
   - 获取当周日记文件列表、目标周记文件路径、模板路径、周记文件是否已存在。

   ```bash
   node scripts/weekly-report-helper.js --vault <vault-root> --week <YYYY-Www> --mode info
   node scripts/weekly-report-helper.js --vault <vault-root> --week <YYYY-Www> --mode files
   ```

3. **读取日记并提取工作项**
   - 读取当周所有存在的日记文件。
   - 按照"任务解析规则"解析 Tasks emoji 格式和 Dataview field 格式的任务。
   - 可以调用 helper script 的 `parse-file` 模式获得结构化任务列表和嵌套任务状态不一致项：
     ```bash
     node scripts/weekly-report-helper.js --mode parse-file --file "Calendar/Daily Notes/2026年/07月/【日记】2026-07-14.md"
     ```
   - 严格依据规则判定 OKR 工作（仅看 `【OKR工作】` / `【OKR】` / `OKR` 标签）和重点工作（仅看 `【重点工作】` 标记或最高/高优先级）。**中优先级、普通优先级、低优先级任务一律不得标记为【重点工作】，也不得自行推断某任务重要就标记为【重点工作】**。
   - 检查嵌套任务状态一致性：父任务已完成但子任务未完成时（已取消子任务视为已完成），除非用户传递了 `NESTED_TASKS_DEVIATION_NO_APPROVAL`，否则弹窗提示用户。
   - 对未明确进度或分类的任务，通过弹窗询问用户。

4. **生成周报内容**
   - **查询历史进度**：调用 helper script 的 `previous-weeks` 模式，获取最近 4 周（不超过 1 个月）的周记文件路径：
     ```bash
     node scripts/weekly-report-helper.js --vault <vault-root> --week <YYYY-Www> --mode previous-weeks --count 4
     ```
     读取存在的历史周记文件，按时间顺序从近到远查找与当前任务名称相同或高度相似的行，提取其「进度（以百分比形式）」作为上周/上两周进度。
   - **计算本周增量进展**：
     - 公式：`本周增量进度 = 本周进度 - 上周或上两周进度`
     - 如果查找不到对应任务的历史进度，默认上周/上两周进度为 `0%`。
     - 本周进度是用户确认后的当前整体进度。
   - 在表格上方写一段 **150-250 字**的「工作周报总结」，不加小标题。
   - 总结内容应概括本周整体工作：OKR 工作进展、重点成果、遇到的主要风险或阻碍、下周整体方向等。对于延续性工作，可先简单提一下上周或上两周进展（例如"延续上周 60% 的进度，本周推进至 90%"）。不要编造表格中没有的信息。
   - 使用下方的表格模板生成 Markdown 表格内容。
   - 每个工作项占一行，按以下规则排序：
     1. **OKR 工作在前，非 OKR 工作在后**。
     2. **同一分类内，重点工作在前，非重点工作在后**。
     3. **同一优先级内，工作相关任务在前，非工作相关任务在后**（例如调休、年假等排在最后）。
   - 参考 helper script 输出的 `isOKR`、`isKey`、`isWorkRelated` 字段进行排序。

5. **确保周记文件存在**
   - 如果目标周记文件已存在，跳到步骤 7。
   - 如果不存在，**必须使用 Templater 命令创建**（严禁手动创建文件、硬编码 frontmatter 或 heading 骨架作为替代）：
     1. 加载并调用 `obsidian-cli` skill，执行：
        ```bash
        obsidian templater:create-from-template template="Calendar/Weekly Notes/【Template】Weekly Note.md" file="Calendar/Weekly Notes/2026年/【周记】2026-W29-07-13.md" silent
        ```
        - 说明：`template` 参数使用**相对于 Templater 模板文件夹的路径**（因为 Templater 已配置模板文件夹为 `Templates`，所以模板路径为 `Calendar/Weekly Notes/【Template】Weekly Note.md`）；`file` 参数使用周记文件的相对路径（不带 `.md` 后缀）。
     2. 如果返回 `Error: No template folder configured`，停止执行并提示用户：
        > "Templater 插件未配置模板文件夹。请打开 Obsidian 设置 → 第三方插件 → Templater → Template folder location，设置为包含周报模板的最外层文件夹（例如 `Templates`），然后重试。"
     3. 如果 `obsidian-cli` 不可用，或 Templater 命令返回其他错误：停止执行，把原始错误信息原样展示给用户，并请用户处理（例如开启 Obsidian、启动 Templater 插件、检查模板路径）。**严禁跳过这一步手动创建文件。**

6. **填充 Weekly Template Tags**
   - Templater 只渲染 `<%* %>` / `<% %>` 语法，不会替换 Periodic Notes 插件使用的 `{{monday:FORMAT}}`、`{{sunday:FORMAT}}` 等标签。创建完周记文件后，必须调用 helper script 填充这些标签：
     ```bash
     node scripts/weekly-report-helper.js --mode fill-template-tags --vault <vault-root> --week <YYYY-Www> --file "Calendar/Weekly Notes/2026年/【周记】YYYY-Www-MM-DD.md"
     ```
   - helper script 会读取文件，按本周日期替换以下标签并原位写回，同时打印替换清单：
     - `{{title}}` → 周记文件名（不含 `.md` 后缀）
     - `{{date:FORMAT}}` / `{{time:FORMAT}}` → 本周第一天（周一）的日期 / 当前时间
     - `{{sunday:FORMAT}}`、`{{monday:FORMAT}}`、`{{tuesday:FORMAT}}`、`{{wednesday:FORMAT}}`、`{{thursday:FORMAT}}`、`{{friday:FORMAT}}`、`{{saturday:FORMAT}}` → 对应日期按 FORMAT 格式化
   - `FORMAT` 是 Moment.js 格式字符串，**必须显式指定**（例如 `gggg-MM-DD`、`YYYY-MM-DD`、`gggg-[W]ww`、`gggg [Week] ww`）。
   - 假设本周从周一开始（与 `【周记】gggg-[W]ww-MM-DD` 命名规则一致）。
   - 执行完成后，检查输出中的 `replacementsCount` 与 `replacements` 数组，确认 frontmatter 中的 `Calendar_Week_StartDay`、`Calendar_Week_EndDay` 等模板字段已填充为真实日期。
   - 如果文件中仍有未填充的 `{{...}}` 标签，立即向用户报告并停止后续流程。

7. **写入或展示**
   - 如果用户在调用本 Skill 时显式传递了 `WRITE_DIRECTLY`，将生成的周报内容直接写入周记文件的指定 heading 下。
   - 否则，将生成的周报内容输出给用户 Review，等待确认后再写入。
   - **写入策略**（按可靠性优先）：
     1. **首选直接文件写入**：读取目标周记文件，将生成的周报内容作为 `### 工作周报（AI 生成）` 插入到 `## 本周小结` 下，然后写回完整文件。这是最安全的方式，不受 CLI 参数长度限制。
     2. **备选 `obsidian insert`**：如果用户明确要求使用 Obsidian CLI 操作，可以尝试：
        ```bash
        obsidian insert path="Calendar/Weekly Notes/2026年/【周记】2026-W29-07-13.md" location=after content="..."
        ```
        但仅用于**短内容**（如标题、小段落）。如果返回 `(no output)` 或静默失败，或文件读取后内容未插入，立即回退到直接文件写入。
     3. **验证**：写入后通过 `obsidian read path="..."` 或重新读取文件验证内容是否已正确写入。

## 输出排序规则

生成周报表格时，所有工作项按以下顺序排列（优先级从高到低）：

1. **OKR 工作 > 非 OKR 工作**
2. **重点工作 > 非重点工作**（在 OKR 内部和非 OKR 内部分别排序）
3. **工作相关 > 非工作相关**（例如调休、年假、事假、病假等个人事务排在最后；出差、外出、培训等仍视为工作相关）

helper script 会为每个任务输出：

- `isOKR`：是否为 OKR 工作
- `isKey`：是否为重点工作
- `isWorkRelated`：是否为工作相关

模型根据这三个字段对任务排序后，再填入表格。

## 周报模板

生成的工作周报内容包含两部分：上方的「工作周报总结」段落，以及下方的表格。整体结构如下：

```markdown
本周主要围绕 OPS 日志平台迁移和部门技术分享展开。OKR 工作方面，延续上周 60% 的进度，迁移事项与 OPS 团队达成 90% 共识，迁移方案初稿已完成，但人力协商仍存在变数；非 OKR 工作方面，技术分享 PPT 初稿和提纲已完成，分享时间待定。下周重点推进迁移人力协商和技术分享 PPT 完善，同时关注外部依赖带来的进度风险。

| 姓名 | 分类 | 重点工作任务描述 | 关键进展 | 进度（以百分比形式） | 本周增量进度 | 风险及应对措施 | 输出 | 下周计划及预期进度（百分比形式） |
|------|------|------------------|----------|----------------------|--------------|----------------|------|----------------------------------|
| 张三 | **OKR 工作**<br>【OKR工作】 | 【重点工作】XXX 平台迁移 | 1. 沟通 OPS 平台迁移事项：达成 90% 共识<br>2. 完成迁移方案初稿 | 90% | 30% | 人力协商存变数，下周继续推进 | [Confluence 链接]() | 就人力问题再商议，预期进度 100% |
| 张三 | **非 OKR 工作** | 【重点工作】部门技术分享准备 | 完成 PPT 初稿和分享提纲 | 60% | 40% | 分享时间待定 | [GitLab 链接]() | 完善 PPT，预期进度 100% |
```

**总结段落要求：**
- 放在表格上方，不加小标题。
- 字数控制在 **150-250 字**（中文）。
- 内容基于表格中的实际工作项提炼，不编造、不夸大。

### 字段说明

- **姓名**：固定使用用户的姓名（本 Skill 中可写"架构师"或用户指定的姓名）。
- **分类**：`OKR 工作` 或 `非 OKR 工作`。OKR 工作必须依据任务解析规则中的 OKR 判定条件，禁止推断。
- **重点工作任务描述**：任务名称。仅当任务正文含 `【重点工作】` 或优先级为最高/高时，才在前面标记 `【重点工作】`。**中/普通/低优先级任务不得标记 `【重点工作】`，禁止自行推断**。
- **关键进展**：具体进展，可用编号列表。
- **进度（以百分比形式）**：当前整体进度，例如 `90%`。
- **本周增量进度**：本周新增的进度，例如 `30%`。通过查询上一周或上两周同任务的历史进度计算：`本周增量进度 = 本周进度 - 上周/上两周进度`；查不到时默认上周/上两周进度为 `0%`。
- **风险及应对措施**：识别风险并给出应对计划。
- **输出**：Confluence / GitLab 等链接，若没有可留空或写"无"。
- **下周计划及预期进度（百分比形式）**：下周要做的事项及预期进度。

## 与用户的交互

### 嵌套任务状态校验

在解析任务后，对嵌套任务做简单一致性校验：

- **校验规则**：如果父任务已标记为完成（`[x]`、`✅` 或 `❌`），但其子任务中还有未完成的（`[ ]` 且未取消），则视为状态不一致。
- **已取消子任务视为已完成**：子任务标记为 `[-]`、`status:: cancelled`，或带有 `❌` / `[cancelled:: ...]` 时，视为已完成，不计入未完成列表。
- **处理方式**：
  - 默认情况下，通过弹窗提示用户：
    > "任务'完成迁移方案初稿'已标记为完成，但其子任务'补充网络拓扑图'、'与 OPS 确认人力'尚未完成。请确认是否继续按完成状态写入周报？"
  - 如果用户调用时显式传递了 `NESTED_TASKS_DEVIATION_NO_APPROVAL`，则不弹窗提示，直接继续生成周报。

helper script 的 `parse-file` 模式会在输出中返回 `deviations` 数组，包含所有检测到的状态不一致项。

### 进度不明的任务

如果在日记中看到任务描述但无法判断当前进度，不要猜测。使用弹窗或提问方式向用户确认：

> "日记中提到'沟通 OPS 平台迁移'，但未说明当前进度。你认为这项任务当前进度是多少？"

获取答案后继续生成周报。

### 日记缺失

如果当周某些天的日记文件不存在，继续处理已存在的日记，并在周报输出顶部添加一行说明：

```markdown
> 本周缺少以下日期的日记：2026-07-08、2026-07-11。
```

### 周记文件不存在且 obsidian-cli 不可用

输出手动操作步骤，等待用户完成后再继续写入。

## 直接写入模式

如果用户调用时包含 `WRITE_DIRECTLY`（不区分大小写，例如"WRITE_DIRECTLY 生成本周周报"），则跳过 Review，直接完成文件写入。写入后向用户报告文件路径和简要摘要。

## 配置开关

以下开关在调用 Skill 时通过用户 prompt 传递：

| 开关 | 作用 |
|------|------|
| `WRITE_DIRECTLY` | 跳过 Review，直接写入周记文件。 |
| `NESTED_TASKS_DEVIATION_NO_APPROVAL` | 嵌套任务状态不一致时（父任务完成但子任务未完成），不弹窗询问，直接继续生成周报。 |

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 日记文件夹不存在 | 报错并提示检查 Vault 根目录下的 `Calendar/Daily Notes` 路径 |
| 目标 heading 不存在 | 自动创建 `# Weekly Note > ## 本周小结 > ### 工作周报（AI 生成）` 层级 |
| `obsidian-cli` 不可用或 Templater 命令失败 | 停止执行，把原始错误展示给用户；**严禁回退到手动创建文件** |
| Templater 返回 `No template folder configured` | 停止执行，提示用户设置 Templater 的 Template folder location 为 `Templates` |
| `obsidian insert` 返回 `(no output)` 或静默失败 | 回退到直接文件写入并验证 |
| helper script `fill-template-tags` 后仍有 `{{...}}` 残留 | 报告残留标签，停止后续流程 |
| helper script 输出无法解析 | 报错并提示检查脚本是否可执行 |

## 示例调用

```
请帮我生成本周的周报。
```

```
WRITE_DIRECTLY 生成 2026-W28 的周报。
```

```
根据本周日记生成数据智能产品组个人周报，我要 Review 后再写入。
```
