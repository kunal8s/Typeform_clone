export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "dropdown"
  | "email"
  | "number"
  | "yes_no"
  | "rating";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description: string;
  required: boolean;
  options: QuestionOption[];
  position: number;
}

export interface FormData {
  id: number;
  title: string;
  description: string;
  is_published: boolean;
  share_slug: string;
  questions: Question[];
}

export interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  description: string;
}

export interface QuestionTypeCategory {
  name: string;
  types: QuestionTypeInfo[];
}

export const QUESTION_TYPE_CATEGORIES: QuestionTypeCategory[] = [
  {
    name: "Contact Info",
    types: [
      { type: "email", label: "Email", description: "Collect email addresses" },
    ],
  },
  {
    name: "Choice",
    types: [
      { type: "multiple_choice", label: "Multiple Choice", description: "Let people select one or more options" },
      { type: "dropdown", label: "Dropdown", description: "Select from a dropdown list" },
      { type: "yes_no", label: "Yes / No", description: "Simple yes or no question" },
    ],
  },
  {
    name: "Rating & Number",
    types: [
      { type: "rating", label: "Rating", description: "Rate with stars" },
      { type: "number", label: "Number", description: "Collect numeric values" },
    ],
  },
  {
    name: "Text",
    types: [
      { type: "short_text", label: "Short Text", description: "Short text answer" },
      { type: "long_text", label: "Long Text", description: "Longer text answer" },
    ],
  },
];

export function getDefaultTitle(type: QuestionType): string {
  const map: Record<QuestionType, string> = {
    short_text: "Short text question",
    long_text: "Long text question",
    multiple_choice: "Multiple choice question",
    dropdown: "Dropdown question",
    email: "What's your email?",
    number: "Number question",
    yes_no: "Yes or no question",
    rating: "How would you rate this?",
  };
  return map[type];
}

export function getTypeIcon(type: QuestionType): string {
  const map: Record<QuestionType, string> = {
    short_text: "Aa",
    long_text: "¶",
    multiple_choice: "☑",
    dropdown: "▾",
    email: "@",
    number: "#",
    yes_no: "Y/N",
    rating: "★",
  };
  return map[type];
}

export function getTypeLabel(type: QuestionType): string {
  const map: Record<QuestionType, string> = {
    short_text: "Short Text",
    long_text: "Long Text",
    multiple_choice: "Multiple Choice",
    dropdown: "Dropdown",
    email: "Email",
    number: "Number",
    yes_no: "Yes / No",
    rating: "Rating",
  };
  return map[type];
}
