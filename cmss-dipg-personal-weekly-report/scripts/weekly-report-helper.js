#!/usr/bin/env node
/**
 * CMSS DIPG Personal Weekly Report Helper
 *
 * 负责确定性计算：周次、日期范围、日记/周记文件路径等。
 * 不处理内容生成。
 */

const fs = require('fs');
const path = require('path');

// === Task parsing ===

const PRIORITY_EMOJI = {
  '🔺': 'highest',
  '⏫': 'high',
  '🔼': 'medium',
  '🔽': 'low',
  '⏬': 'lowest',
};

const PRIORITY_ORDER = ['highest', 'high', 'medium', 'normal', 'low', 'lowest'];

const DATE_EMOJI = {
  '➕': 'created',
  '🛫': 'start',
  '⏳': 'scheduled',
  '📅': 'due',
  '✅': 'completion',
  '❌': 'cancelled',
};

const DATE_FIELD_ALIASES = {
  created: 'created',
  createdDate: 'created',
  start: 'start',
  startDate: 'start',
  scheduled: 'scheduled',
  scheduledDate: 'scheduled',
  due: 'due',
  dueDate: 'due',
  completion: 'completion',
  completionDate: 'completion',
  cancelled: 'cancelled',
  cancelledDate: 'cancelled',
};

const CANCEL_REASON_ALIASES = {
  'cancel-reason': true,
  cancelreason: true,
  'cancellation-reason': true,
  cancellationreason: true,
  reason: true,
};

const NON_WORK_KEYWORDS = [
  '调休',
  '年假',
  '年休',
  '事假',
  '病假',
  '婚假',
  '产假',
  '陪产假',
  '丧假',
  '公休',
  '请假',
  '休假',
];

function parseTasks(content) {
  const lines = content.split(/\r?\n/);
  const rootTasks = [];
  const stack = []; // { level, task }

  for (const rawLine of lines) {
    const task = parseTaskLine(rawLine);
    if (!task) continue;

    const level = getIndentLevel(rawLine);

    // 最多支持 3 层：0, 1, 2；超过则忽略
    if (level > 2) continue;

    task.level = level;
    task.children = [];

    // 找到正确的父级：弹出同级或更深级的任务
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootTasks.push(task);
    } else {
      stack[stack.length - 1].task.children.push(task);
    }

    stack.push({ level, task });
  }

  return rootTasks;
}

function getIndentLevel(line) {
  const match = line.match(/^(\s*)-/);
  if (!match) return 0;
  // 将 tab 按 2 个空格计算，再按每级 2 个空格换算
  const spaces = match[1].replace(/\t/g, '  ').length;
  return Math.floor(spaces / 2);
}

function isTaskDone(task) {
  return task.status === 'done' || task.status === 'cancelled' || task.completion !== null || task.cancelled !== null;
}

function isTaskIncomplete(task) {
  return task.status !== 'done' && task.status !== 'cancelled' && task.completion === null && task.cancelled === null;
}

function findNestedDeviations(tasks) {
  const deviations = [];
  for (const task of tasks) {
    collectDeviations(task, deviations);
  }
  return deviations;
}

function collectDeviations(task, deviations) {
  if (task.children && task.children.length > 0) {
    const incompleteChildren = task.children.filter(isTaskIncomplete);
    if (isTaskDone(task) && incompleteChildren.length > 0) {
      deviations.push({
        parentRaw: task.raw,
        parentTitle: task.title,
        incompleteChildren: incompleteChildren.map(child => ({
          raw: child.raw,
          title: child.title,
          status: child.status,
        })),
      });
    }
    for (const child of task.children) {
      collectDeviations(child, deviations);
    }
  }
}

function parseTaskLine(line) {
  // Match checkbox: - [ ], - [x], - [-]
  const checkboxMatch = line.match(/^\s*- \[([ xX-])\]\s+(.*)$/);
  if (!checkboxMatch) return null;

  const checkbox = checkboxMatch[1].toLowerCase();
  let status;
  if (checkbox === 'x') status = 'done';
  else if (checkbox === '-') status = 'cancelled';
  else status = 'todo';
  const raw = checkboxMatch[2];

  let working = raw;

  // Parse Dataview fields first and remove them
  const dataviewFields = {};
  let dataviewStatus = null;
  let dataviewCancelReason = null;
  working = working.replace(/\[([\w-]+)::\s*([^\]]*)\]/g, (match, key, value) => {
    const keyLower = key.toLowerCase();
    const normalized = DATE_FIELD_ALIASES[keyLower];
    if (normalized) {
      dataviewFields[normalized] = value.trim();
    } else if (keyLower === 'priority') {
      dataviewFields.priority = value.trim().toLowerCase();
    } else if (keyLower === 'status') {
      dataviewStatus = value.trim().toLowerCase();
    } else if (CANCEL_REASON_ALIASES[keyLower]) {
      dataviewCancelReason = value.trim();
    }
    return ' ';
  });

  // Apply Dataview status override if present
  if (dataviewStatus) {
    if (dataviewStatus === 'cancelled' || dataviewStatus === 'canceled') {
      status = 'cancelled';
    } else if (dataviewStatus === 'done' || dataviewStatus === 'completed') {
      status = 'done';
    } else if (dataviewStatus === 'todo' || dataviewStatus === 'open') {
      status = 'todo';
    }
  }

  // Parse emoji priority and dates
  const emojiPriority = parseEmojiPriority(working);
  const emojiDates = parseEmojiDates(working);
  working = stripEmojiTokens(working);

  // Determine priority
  let priority = dataviewFields.priority || emojiPriority || 'normal';
  if (!PRIORITY_ORDER.includes(priority)) priority = 'normal';

  // Merge dates: dataview fields take precedence over emoji
  const dates = { ...emojiDates, ...dataviewFields };

  // Clean title: remove extra spaces, collapse multiple spaces
  const title = working.replace(/\s+/g, ' ').trim();

  const fullText = line.trim();
  const isOKR = /【OKR工作】|【OKR】|#OKR|#okr\b/.test(fullText);
  const isKey = /【重点工作】/.test(fullText) || priority === 'highest' || priority === 'high';
  const isWorkRelated = !NON_WORK_KEYWORDS.some(kw => fullText.includes(kw));

  const cancelReason = dataviewCancelReason || extractCancelReason(fullText);

  return {
    raw: line.trim(),
    title,
    status,
    priority,
    created: dates.created || null,
    start: dates.start || null,
    scheduled: dates.scheduled || null,
    due: dates.due || null,
    completion: dates.completion || null,
    cancelled: dates.cancelled || null,
    cancelReason,
    isOKR,
    isKey,
    isWorkRelated,
  };
}

function extractCancelReason(text) {
  // 1. Dataview-style cancel reason is already captured during field parsing.
  // 2. Text patterns: 取消原因：... / Cancel reason: ... / Cancelled due to: ...
  //    The reason is written in the task body (title). It may be followed by
  //    more task metadata (priority/date emoji, Dataview fields). Stop at the
  //    next task emoji or '[' to avoid capturing unrelated text.
  const emojiStop = Object.keys(PRIORITY_EMOJI)
    .concat(Object.keys(DATE_EMOJI))
    .map(escapeRegex)
    .join('|');
  const textRe = new RegExp(
    '(?:取消原因|Cancel reason|Cancelled due to|Canceled due to)[\\s:：]+(.+?)(?=\\s*(?:' + emojiStop + '|\\[|【)|$)',
    'i'
  );
  const textMatch = text.match(textRe);
  if (textMatch) {
    return textMatch[1].trim().replace(/\s+/g, ' ');
  }
  // 3. Tag patterns: #cancel/xxx #取消/xxx #cancelled/xxx #cancel-reason/xxx
  const tagMatch = text.match(/#(?:cancel|取消|cancelled|cancel-reason)\/([^\s\]]+)/i);
  if (tagMatch) {
    return tagMatch[1].trim().replace(/[_-]/g, ' ');
  }
  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseEmojiPriority(text) {
  for (const emoji of Object.keys(PRIORITY_EMOJI)) {
    if (text.includes(emoji)) return PRIORITY_EMOJI[emoji];
  }
  return null;
}

function parseEmojiDates(text) {
  const dates = {};
  for (const [emoji, field] of Object.entries(DATE_EMOJI)) {
    const re = new RegExp(emoji + '\\s*(\\d{4}-\\d{2}-\\d{2})', 'g');
    let match;
    while ((match = re.exec(text)) !== null) {
      dates[field] = match[1];
    }
  }
  return dates;
}

function stripEmojiTokens(text) {
  // Remove priority emojis and date emoji+date tokens
  let result = text;
  for (const emoji of Object.keys(PRIORITY_EMOJI)) {
    result = result.split(emoji).join(' ');
  }
  for (const emoji of Object.keys(DATE_EMOJI)) {
    const re = new RegExp(emoji + '\\s*\\d{4}-\\d{2}-\\d{2}', 'g');
    result = result.replace(re, ' ');
  }
  return result;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// === Weekly Template Tags ===

// Format a Date using a Moment.js-compatible format string.
// Supports common tokens used in Obsidian Periodic Notes:
//   gggg (ISO week-year), YYYY, YY, MM, DD, ww (ISO week), HH, mm, ss, [literal]
function formatMoment(date, format) {
  const bounds = getWeekBounds(date);
  const replacements = {
    'gggg': bounds.year,
    'YYYY': date.getUTCFullYear(),
    'YY': String(date.getUTCFullYear()).slice(-2),
    'MM': pad(date.getUTCMonth() + 1),
    'DD': pad(date.getUTCDate()),
    'ww': pad(bounds.week),
    'HH': pad(date.getUTCHours()),
    'mm': pad(date.getUTCMinutes()),
    'ss': pad(date.getUTCSeconds()),
  };

  let result = '';
  let i = 0;
  while (i < format.length) {
    // [literal] escape
    if (format[i] === '[') {
      const end = format.indexOf(']', i);
      if (end !== -1) {
        result += format.slice(i + 1, end);
        i = end + 1;
        continue;
      }
    }
    let matched = false;
    // Try 4-char tokens first, then 3, 2, 1
    for (const len of [4, 3, 2, 1]) {
      const token = format.slice(i, i + len);
      if (replacements[token] !== undefined) {
        result += replacements[token];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += format[i];
      i++;
    }
  }
  return result;
}

// Replace Obsidian Periodic Notes weekly template tags in content.
// Assumes week starts on Monday (matching 【周记】gggg-[W]ww-MM-DD naming).
// Returns { content, replacements }.
function fillTemplateTags(content, bounds, noteTitle) {
  const monday = new Date(bounds.weekStart + 'T00:00:00Z');
  const dayOffset = {
    'monday': 0,
    'tuesday': 1,
    'wednesday': 2,
    'thursday': 3,
    'friday': 4,
    'saturday': 5,
    'sunday': 6,
  };
  const replacements = [];
  const tagRegex = /\{\{(\w+)(?::([^{}]+))?\}\}/g;
  const result = content.replace(tagRegex, (match, tag, format) => {
    const lowerTag = tag.toLowerCase();
    if (lowerTag === 'title') {
      replacements.push({ tag: lowerTag, format: format || null, value: noteTitle });
      return noteTitle;
    }
    if (lowerTag === 'date') {
      const fmt = format || 'gggg-MM-DD';
      const value = formatMoment(monday, fmt);
      replacements.push({ tag: lowerTag, format: fmt, value });
      return value;
    }
    if (lowerTag === 'time') {
      const fmt = format || 'HH:mm';
      const value = formatMoment(new Date(), fmt);
      replacements.push({ tag: lowerTag, format: fmt, value });
      return value;
    }
    if (dayOffset[lowerTag] !== undefined) {
      if (!format) {
        replacements.push({ tag: lowerTag, format: null, value: match, warning: 'no format specified, kept as-is' });
        return match;
      }
      const target = new Date(monday.getTime() + dayOffset[lowerTag] * 24 * 60 * 60 * 1000);
      const value = formatMoment(target, format);
      replacements.push({ tag: lowerTag, format, value });
      return value;
    }
    replacements.push({ tag: lowerTag, format: format || null, value: match, warning: 'unknown tag, kept as-is' });
    return match;
  });
  return { content: result, replacements };
}

function parseWeekArg(weekArg) {
  // 支持格式：2026-W28 或 2026W28
  const match = String(weekArg).match(/^(\d{4})[-]?[Ww]?(\d{1,2})$/);
  if (!match) {
    throw new Error(`Invalid week format: "${weekArg}". Expected YYYY-Www or YYYY-WW.`);
  }
  return { year: parseInt(match[1], 10), week: parseInt(match[2], 10) };
}

function getISOWeekDate(year, week) {
  // 计算 ISO 周对应的周一日期
  // ISO 周：第 1 周是包含该年第一个周四的周
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 周一=1, 周日=7
  const firstMonday = new Date(Date.UTC(year, 0, 4 - jan4Day + 1));
  const monday = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  return { monday, sunday };
}

function getWeekBounds(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // 周一=1, 周日=7
  const monday = new Date(d.getTime() - (day - 1) * 24 * 60 * 60 * 1000);
  const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);

  // ISO 周次
  const thursday = new Date(monday.getTime() + 3 * 24 * 60 * 60 * 1000);
  const year = thursday.getUTCFullYear();

  // 计算该年第 1 周周一
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const firstMonday = new Date(Date.UTC(year, 0, 4 - jan4Day + 1));

  const diffMs = monday.getTime() - firstMonday.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const week = Math.floor(diffDays / 7) + 1;

  return {
    year,
    week,
    weekStart: formatDate(monday),
    weekEnd: formatDate(sunday),
  };
}

function formatDate(date) {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  return `${y}-${m}-${d}`;
}

function getWeeklyNotePath(year, week, weekStart) {
  const [ys, ms, ds] = weekStart.split('-');
  return path.posix.join(
    'Calendar',
    'Weekly Notes',
    `${year}年`,
    `【周记】${year}-W${pad(week)}-${ms}-${ds}.md`
  );
}

function getDailyNotePaths(year, weekStart) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const paths = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    paths.push(
      path.posix.join(
        'Calendar',
        'Daily Notes',
        `${y}年`,
        `${m}月`,
        `【日记】${y}-${m}-${day}.md`
      )
    );
  }
  return paths;
}

function getPreviousWeeklyNotes(year, week, count) {
  const { monday } = getISOWeekDate(year, week);
  const paths = [];
  for (let i = 1; i <= count; i++) {
    const prevMonday = new Date(monday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const bounds = getWeekBounds(prevMonday);
    paths.push(getWeeklyNotePath(bounds.year, bounds.week, bounds.weekStart));
  }
  return paths;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    vault: process.cwd(),
    week: undefined,
    mode: 'info',
    file: undefined,
    count: 4,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--vault') {
      result.vault = args[++i];
    } else if (arg === '--week') {
      result.week = args[++i];
    } else if (arg === '--mode') {
      result.mode = args[++i];
    } else if (arg === '--file') {
      result.file = args[++i];
    } else if (arg === '--count') {
      result.count = parseInt(args[++i], 10) || 4;
    }
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv);

  let bounds;
  if (args.week) {
    const { year, week } = parseWeekArg(args.week);
    const { monday, sunday } = getISOWeekDate(year, week);
    bounds = {
      year,
      week,
      weekStart: formatDate(monday),
      weekEnd: formatDate(sunday),
    };
  } else {
    bounds = getWeekBounds(new Date());
  }

  const weeklyNotePath = getWeeklyNotePath(bounds.year, bounds.week, bounds.weekStart);
  const templatePath = path.posix.join(
    'Templates',
    'Calendar',
    'Weekly Notes',
    '【Template】Weekly Note.md'
  );

  if (args.mode === 'files') {
    const dailyNotes = getDailyNotePaths(bounds.year, bounds.weekStart);
    console.log(JSON.stringify({ dailyNotes }, null, 2));
    return;
  }

  if (args.mode === 'parse-file') {
    if (!args.file) {
      throw new Error('--mode parse-file requires --file <path>');
    }
    const content = fs.readFileSync(args.file, 'utf8');
    const tasks = parseTasks(content);
    const deviations = findNestedDeviations(tasks);
    console.log(JSON.stringify({ tasks, deviations }, null, 2));
    return;
  }

  if (args.mode === 'previous-weeks') {
    const previousPaths = getPreviousWeeklyNotes(bounds.year, bounds.week, args.count);
    const existingPaths = previousPaths.map(p => ({
      path: p,
      exists: fs.existsSync(path.join(args.vault, p.replace(/\//g, path.sep))),
    }));
    console.log(JSON.stringify({ previousWeeklyNotes: existingPaths }, null, 2));
    return;
  }

  if (args.mode === 'fill-template-tags') {
    if (!args.file) {
      throw new Error('--mode fill-template-tags requires --file <path>');
    }
    const filePath = path.join(args.vault, args.file.replace(/\//g, path.sep));
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const noteTitle = path.basename(args.file, '.md');
    const { content: newContent, replacements } = fillTemplateTags(content, bounds, noteTitle);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(JSON.stringify({
      file: args.file,
      weekStart: bounds.weekStart,
      weekEnd: bounds.weekEnd,
      replacementsCount: replacements.length,
      replacements,
    }, null, 2));
    return;
  }

  const weeklyNoteFullPath = path.join(args.vault, weeklyNotePath.replace(/\//g, path.sep));
  const output = {
    week: `${bounds.year}-W${pad(bounds.week)}`,
    weekStart: bounds.weekStart,
    weekEnd: bounds.weekEnd,
    weeklyNotePath,
    weeklyNoteExists: fs.existsSync(weeklyNoteFullPath),
    templatePath,
  };
  console.log(JSON.stringify(output, null, 2));
}

module.exports = {
  parseWeekArg,
  getISOWeekDate,
  getWeekBounds,
  formatDate,
  getWeeklyNotePath,
  getDailyNotePaths,
  getPreviousWeeklyNotes,
  parseTasks,
  parseTaskLine,
  findNestedDeviations,
  isTaskDone,
  isTaskIncomplete,
  formatMoment,
  fillTemplateTags,
};

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }, null, 2));
    process.exit(1);
  }
}
