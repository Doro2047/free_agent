import React, { useCallback } from 'react';

export type ExportFormat = 'json' | 'csv' | 'txt' | 'md' | 'html' | 'xml';

export interface ExportableData {
  conversations?: Array<{
    id: string;
    title: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      timestamp: number;
    }>;
    createdAt: number;
    updatedAt: number;
  }>;
  agents?: Array<{
    id: string;
    name: string;
    description: string;
    config: Record<string, unknown>;
  }>;
  settings?: Record<string, unknown>;
  exportDate?: number;
  appVersion?: string;
}

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  prettyPrint?: boolean;
  filename?: string;
}

function convertToCSV(data: ExportableData): string {
  const rows: string[] = [];
  
  if (data.conversations) {
    data.conversations.forEach((conv) => {
      rows.push('Conversation: ' + conv.title);
      rows.push('ID,' + conv.id);
      rows.push('Created,' + new Date(conv.createdAt).toISOString());
      rows.push('');
      
      rows.push('Message ID,Role,Content,Timestamp');
      conv.messages.forEach((msg) => {
        const escapedContent = msg.content.replace(/"/g, '""');
        rows.push(`"${msg.id}","${msg.role}","${escapedContent}","${new Date(msg.timestamp).toISOString()}"`);
      });
      rows.push('');
      rows.push('---');
      rows.push('');
    });
  }
  
  if (data.agents) {
    rows.push('Agents Export');
    rows.push('ID,Name,Description');
    data.agents.forEach((agent) => {
      const escapedDesc = agent.description.replace(/"/g, '""');
      rows.push(`"${agent.id}","${agent.name}","${escapedDesc}"`);
    });
    rows.push('');
  }
  
  return rows.join('\n');
}

function convertToMarkdown(data: ExportableData): string {
  const sections: string[] = [];
  
  sections.push('# Free Agent Export');
  sections.push('');
  
  if (data.exportDate) {
    sections.push(`**Export Date:** ${new Date(data.exportDate).toLocaleString()}`);
  }
  if (data.appVersion) {
    sections.push(`**App Version:** ${data.appVersion}`);
  }
  sections.push('');
  
  if (data.conversations) {
    sections.push('## Conversations');
    sections.push('');
    
    data.conversations.forEach((conv, idx) => {
      sections.push(`### ${idx + 1}. ${conv.title}`);
      sections.push('');
      sections.push(`- **ID:** \`${conv.id}\``);
      sections.push(`- **Created:** ${new Date(conv.createdAt).toLocaleString()}`);
      sections.push(`- **Last Updated:** ${new Date(conv.updatedAt).toLocaleString()}`);
      sections.push('');
      
      conv.messages.forEach((msg) => {
        const role = msg.role === 'user' ? '**You**' : '**Assistant**';
        sections.push(`#### ${role}`);
        sections.push('');
        sections.push(msg.content);
        sections.push('');
        sections.push(`<sub>${new Date(msg.timestamp).toLocaleString()}</sub>`);
        sections.push('');
        sections.push('---');
        sections.push('');
      });
    });
  }
  
  if (data.agents) {
    sections.push('## Agents');
    sections.push('');
    
    data.agents.forEach((agent) => {
      sections.push(`### ${agent.name}`);
      sections.push('');
      sections.push(agent.description);
      sections.push('');
      sections.push('```json');
      sections.push(JSON.stringify(agent.config, null, 2));
      sections.push('```');
      sections.push('');
    });
  }
  
  return sections.join('\n');
}

function convertToHTML(data: ExportableData): string {
  const sections: string[] = [];
  
  sections.push(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Free Agent Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    h3 { color: #666; }
    .conversation { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .message { margin: 15px 0; padding: 15px; border-radius: 8px; }
    .user { background: #eff6ff; }
    .assistant { background: #f0fdf4; }
    .meta { font-size: 12px; color: #888; }
    pre { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 30px 0; }
  </style>
</head>
<body>
  <h1>Free Agent Export</h1>`);
  
  if (data.exportDate) {
    sections.push(`  <p class="meta">Exported on ${new Date(data.exportDate).toLocaleString()}</p>`);
  }
  
  if (data.conversations) {
    sections.push('  <h2>Conversations</h2>');
    
    data.conversations.forEach((conv) => {
      sections.push(`  <div class="conversation">
    <h3>${conv.title}</h3>
    <p class="meta">ID: ${conv.id} | Created: ${new Date(conv.createdAt).toLocaleString()}</p>`);
      
      conv.messages.forEach((msg) => {
        const roleClass = msg.role === 'user' ? 'user' : 'assistant';
        const roleLabel = msg.role === 'user' ? 'You' : 'Assistant';
        sections.push(`    <div class="message ${roleClass}">
      <strong>${roleLabel}</strong>
      <p>${msg.content.replace(/\n/g, '<br>')}</p>
      <p class="meta">${new Date(msg.timestamp).toLocaleString()}</p>
    </div>`);
      });
      
      sections.push('  </div>');
    });
  }
  
  if (data.agents) {
    sections.push('  <h2>Agents</h2>');
    
    data.agents.forEach((agent) => {
      sections.push(`  <div class="conversation">
    <h3>${agent.name}</h3>
    <p>${agent.description}</p>
    <pre>${JSON.stringify(agent.config, null, 2)}</pre>
  </div>`);
    });
  }
  
  sections.push(`</body>
</html>`);
  
  return sections.join('\n');
}

function convertToXML(data: ExportableData): string {
  const sections: string[] = [];
  
  sections.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  sections.push(`<export>`);
  sections.push(`  <metadata>`);
  
  if (data.exportDate) {
    sections.push(`    <exportDate>${new Date(data.exportDate).toISOString()}</exportDate>`);
  }
  if (data.appVersion) {
    sections.push(`    <appVersion>${data.appVersion}</appVersion>`);
  }
  sections.push(`  </metadata>`);
  
  if (data.conversations) {
    sections.push(`  <conversations>`);
    
    data.conversations.forEach((conv) => {
      sections.push(`    <conversation id="${conv.id}">`);
      sections.push(`      <title><![CDATA[${conv.title}]]></title>`);
      sections.push(`      <createdAt>${new Date(conv.createdAt).toISOString()}</createdAt>`);
      sections.push(`      <updatedAt>${new Date(conv.updatedAt).toISOString()}</updatedAt>`);
      sections.push(`      <messages>`);
      
      conv.messages.forEach((msg) => {
        sections.push(`        <message id="${msg.id}">`);
        sections.push(`          <role>${msg.role}</role>`);
        sections.push(`          <content><![CDATA[${msg.content}]]></content>`);
        sections.push(`          <timestamp>${new Date(msg.timestamp).toISOString()}</timestamp>`);
        sections.push(`        </message>`);
      });
      
      sections.push(`      </messages>`);
      sections.push(`    </conversation>`);
    });
    
    sections.push(`  </conversations>`);
  }
  
  if (data.agents) {
    sections.push(`  <agents>`);
    
    data.agents.forEach((agent) => {
      sections.push(`    <agent id="${agent.id}">`);
      sections.push(`      <name><![CDATA[${agent.name}]]></name>`);
      sections.push(`      <description><![CDATA[${agent.description}]]></description>`);
      sections.push(`      <config><![CDATA[${JSON.stringify(agent.config)}]]></config>`);
      sections.push(`    </agent>`);
    });
    
    sections.push(`  </agents>`);
  }
  
  sections.push(`</export>`);
  
  return sections.join('\n');
}

function convertToJSON(data: ExportableData, prettyPrint: boolean): string {
  return prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

function convertToText(data: ExportableData): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(50));
  lines.push('FREE AGENT EXPORT');
  lines.push('='.repeat(50));
  lines.push('');
  
  if (data.exportDate) {
    lines.push(`Export Date: ${new Date(data.exportDate).toLocaleString()}`);
  }
  if (data.appVersion) {
    lines.push(`App Version: ${data.appVersion}`);
  }
  lines.push('');
  
  if (data.conversations) {
    lines.push('-'.repeat(50));
    lines.push('CONVERSATIONS');
    lines.push('-'.repeat(50));
    lines.push('');
    
    data.conversations.forEach((conv, idx) => {
      lines.push(`[${idx + 1}] ${conv.title}`);
      lines.push(`ID: ${conv.id}`);
      lines.push(`Created: ${new Date(conv.createdAt).toLocaleString()}`);
      lines.push('');
      
      conv.messages.forEach((msg) => {
        lines.push(`${msg.role.toUpperCase()} (${new Date(msg.timestamp).toLocaleString()}):`);
        lines.push(msg.content);
        lines.push('');
      });
      
      lines.push('='.repeat(30));
      lines.push('');
    });
  }
  
  if (data.agents) {
    lines.push('-'.repeat(50));
    lines.push('AGENTS');
    lines.push('-'.repeat(50));
    lines.push('');
    
    data.agents.forEach((agent) => {
      lines.push(`* ${agent.name}`);
      lines.push(agent.description);
      lines.push('');
    });
  }
  
  return lines.join('\n');
}

export function convertData(data: ExportableData, options: ExportOptions): string {
  const { format, prettyPrint = true } = options;
  
  switch (format) {
    case 'json':
      return convertToJSON(data, prettyPrint);
    case 'csv':
      return convertToCSV(data);
    case 'txt':
      return convertToText(data);
    case 'md':
      return convertToMarkdown(data);
    case 'html':
      return convertToHTML(data);
    case 'xml':
      return convertToXML(data);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

export function getFileExtension(format: ExportFormat): string {
  const extensions: Record<ExportFormat, string> = {
    json: 'json',
    csv: 'csv',
    txt: 'txt',
    md: 'md',
    html: 'html',
    xml: 'xml',
  };
  return extensions[format];
}

export function getMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    json: 'application/json',
    csv: 'text/csv',
    txt: 'text/plain',
    md: 'text/markdown',
    html: 'text/html',
    xml: 'application/xml',
  };
  return mimeTypes[format];
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function exportData(data: ExportableData, options: ExportOptions): void {
  const { format, filename, prettyPrint = true } = options;
  
  const content = convertData(data, { format, prettyPrint });
  const extension = getFileExtension(format);
  const mimeType = getMimeType(format);
  
  const defaultFilename = `free-agent-export-${Date.now()}`;
  const finalFilename = filename 
    ? (filename.endsWith(`.${extension}`) ? filename : `${filename}.${extension}`)
    : `${defaultFilename}.${extension}`;
  
  downloadFile(content, finalFilename, mimeType);
}

export interface ExportButtonProps {
  data: ExportableData;
  options?: Partial<ExportOptions>;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ExportButton({
  data,
  options = {},
  children = 'Export',
  className,
  style,
}: ExportButtonProps) {
  const handleClick = useCallback(() => {
    const exportData: ExportableData = {
      ...data,
      exportDate: Date.now(),
      appVersion: '1.0.0',
    };
    
    exportData(exportData, {
      format: 'json',
      prettyPrint: true,
      ...options,
    });
  }, [data, options]);

  return (
    <button onClick={handleClick} className={className} style={style}>
      {children}
    </button>
  );
}

export interface ExportMenuProps {
  data: ExportableData;
  defaultOptions?: Partial<ExportOptions>;
  trigger?: React.ReactNode;
  className?: string;
}

export function ExportMenu({ data, defaultOptions = {}, trigger }: ExportMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const formats: { format: ExportFormat; label: string; icon: string }[] = [
    { format: 'json', label: 'JSON', icon: '{ }' },
    { format: 'csv', label: 'CSV', icon: '|||' },
    { format: 'txt', label: 'Plain Text', icon: 'Aa' },
    { format: 'md', label: 'Markdown', icon: 'MD' },
    { format: 'html', label: 'HTML', icon: '<>' },
    { format: 'xml', label: 'XML', icon: '</>' },
  ];
  
  const handleExport = (format: ExportFormat) => {
    const exportData: ExportableData = {
      ...data,
      exportDate: Date.now(),
      appVersion: '1.0.0',
    };
    
    exportData(exportData, {
      format,
      prettyPrint: true,
      ...defaultOptions,
    });
    
    setIsOpen(false);
  };
  
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setIsOpen(!isOpen)}>
        {trigger || 'Export'}
      </button>
      
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              minWidth: '160px',
              overflow: 'hidden',
            }}
          >
            {formats.map(({ format, label, icon }) => (
              <button
                key={format}
                onClick={() => handleExport(format)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    backgroundColor: '#e5e7eb',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {icon}
                </span>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export const ExportUtils = {
  convertData,
  exportData,
  downloadFile,
  getFileExtension,
  getMimeType,
};

export default ExportUtils;
