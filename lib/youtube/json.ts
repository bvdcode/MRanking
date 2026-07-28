import type { JsonObject, JsonValue } from "./types";

export function textValue(value: JsonValue): string {
  if (typeof value === "string") {
    return value;
  }
  if (!isObject(value)) {
    return "";
  }
  if (typeof value.simpleText === "string") {
    return value.simpleText;
  }
  if (Array.isArray(value.runs)) {
    return value.runs
      .map((run) => (isObject(run) ? stringValue(run.text) : ""))
      .join("");
  }
  return contentValue(value);
}

export function contentValue(value: JsonValue): string {
  if (typeof value === "string") {
    return value;
  }
  if (!isObject(value)) {
    return "";
  }
  if (typeof value.content === "string") {
    return value.content;
  }
  if (typeof value.simpleText === "string") {
    return value.simpleText;
  }
  if (Array.isArray(value.runs)) {
    return value.runs
      .map((run) => (isObject(run) ? stringValue(run.text) : ""))
      .join("");
  }
  return "";
}

export function thumbnailValue(value: JsonValue) {
  if (!isObject(value) || !Array.isArray(value.thumbnails)) {
    return "";
  }
  const thumbnails = value.thumbnails.filter(isObject);
  return thumbnails.length
    ? stringValue(thumbnails.at(-1)?.url).replace(/^\/\//, "https://")
    : "";
}

export function walk(value: JsonValue, visit: (node: JsonObject) => void) {
  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visit);
    }
    return;
  }
  if (!isObject(value)) {
    return;
  }
  visit(value);
  for (const child of Object.values(value)) {
    walk(child, visit);
  }
}

export function walkValues(value: JsonValue, visit: (text: string) => void) {
  if (typeof value === "string") {
    return visit(value);
  }
  if (Array.isArray(value)) {
    return value.forEach((item) => walkValues(item, visit));
  }
  if (isObject(value)) {
    Object.values(value).forEach((item) => walkValues(item, visit));
  }
}

export function isObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringValue(value: JsonValue) {
  return typeof value === "string" ? value : "";
}
