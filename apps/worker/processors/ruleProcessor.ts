import type { EmailMessage } from "@google-auto-work/google-client";

export interface RuleCondition {
  field: "from" | "to" | "subject" | "body" | "hasAttachment" | "label";
  operator: "contains" | "equals" | "startsWith" | "endsWith" | "regex" | "notContains";
  value: string;
}

export interface RuleAction {
  type:
    | "addLabel"
    | "removeLabel"
    | "archive"
    | "trash"
    | "createCalendarEvent"
    | "generateDraft";
  params?: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
}

function evaluateCondition(
  condition: RuleCondition,
  email: EmailMessage
): boolean {
  const fieldValues: Record<string, string> = {
    from: email.from.toLowerCase(),
    to: email.to.toLowerCase(),
    subject: email.subject.toLowerCase(),
    body: email.body.toLowerCase(),
    label: email.labelIds.join(",").toLowerCase(),
    hasAttachment: "false", // simplified
  };

  const fieldValue = fieldValues[condition.field] ?? "";
  const matchValue = condition.value.toLowerCase();

  switch (condition.operator) {
    case "contains":
      return fieldValue.includes(matchValue);
    case "notContains":
      return !fieldValue.includes(matchValue);
    case "equals":
      return fieldValue === matchValue;
    case "startsWith":
      return fieldValue.startsWith(matchValue);
    case "endsWith":
      return fieldValue.endsWith(matchValue);
    case "regex":
      try {
        return new RegExp(condition.value, "i").test(fieldValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function evaluateRule(
  rule: AutomationRule,
  email: EmailMessage
): boolean {
  if (rule.conditions.length === 0) return true;
  return rule.conditions.every((cond) => evaluateCondition(cond, email));
}

export function matchingRules(
  rules: AutomationRule[],
  email: EmailMessage
): AutomationRule[] {
  return rules
    .filter((rule) => evaluateRule(rule, email))
    .sort((a, b) => a.priority - b.priority);
}
