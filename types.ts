export type FieldType = 'text' | 'textarea';

export interface SectionDefinition {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  aiPrompt?: string; // Prompt suggestion for AI
}

export interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  sections: SectionDefinition[];
}

export interface ReportVersion {
  id: string;
  timestamp: number;
  name?: string;
  values: Record<string, string>;
  attachments?: Record<string, string>;
}

export interface ReportData {
  templateId: string;
  lastModified: number;
  values: Record<string, string>;
  attachments: Record<string, string>; // ID -> Base64 Data URI
  history: ReportVersion[];
}

export interface TemplatesMap {
  [key: string]: ReportTemplate;
}