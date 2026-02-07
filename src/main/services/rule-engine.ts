import type { TagRule, PendingChange, FileRecord } from "../../shared/types";
import { getFileTags, getFileById } from "../db/queries";
import { v4 as uuidv4 } from "uuid";
import * as path from "node:path";

/**
 * Preview what a tag rule would do when applied to the given files.
 * Returns PendingChange objects without actually applying anything.
 */
export function previewTagRule(
  rule: TagRule,
  fileIds: number[],
): PendingChange[] {
  const changes: PendingChange[] = [];
  let regex: RegExp;

  try {
    regex = new RegExp(rule.regex);
  } catch {
    return changes; // Invalid regex
  }

  for (let idx = 0; idx < fileIds.length; idx++) {
    const fileId = fileIds[idx];
    const file = getFileById(fileId);
    if (!file) continue;

    const sourceValue = getSourceValue(rule.source_field, file, fileId, idx);
    if (sourceValue === null) continue;

    const match = sourceValue.match(regex);
    if (!match) continue;

    // Apply template with capture groups
    let newValue = rule.template;
    for (let i = 0; i <= match.length; i++) {
      newValue = newValue.replace(new RegExp(`\\$${i}`, "g"), match[i] || "");
    }
    newValue = newValue.trim();
    if (!newValue) continue;

    // Get current value of target field
    const tags = getFileTags(fileId);
    const existing = tags.find((t) => t.key === rule.target_field);
    const oldValue = existing?.value ?? null;

    // Only create change if value is different
    if (oldValue === newValue) continue;

    changes.push({
      id: uuidv4(),
      file_id: fileId,
      file_path: file.path,
      filename: file.filename,
      key: rule.target_field,
      old_value: oldValue,
      new_value: newValue,
      status: "pending",
    });
  }

  return changes;
}

function getSourceValue(
  sourceField: string,
  file: FileRecord,
  fileId: number,
  index: number,
): string | null {
  if (sourceField === "filename") {
    return file.filename;
  }
  if (sourceField === "folder") {
    return path.dirname(file.path);
  }
  if (sourceField === "index") {
    return String(index + 1);
  }
  if (sourceField === "datetime") {
    return file.modified_at;
  }
  if (sourceField.startsWith("tag:")) {
    const tagKey = sourceField.substring(4);
    const tags = getFileTags(fileId);
    const tag = tags.find((t) => t.key === tagKey);
    return tag?.value ?? null;
  }
  return null;
}
