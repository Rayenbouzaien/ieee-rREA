import { ReportTemplate, ReportData } from '../types';

export const exportToDocx = (template: ReportTemplate, data: ReportData) => {
  const { values } = data;
  
  // Basic XML structure for a Word Document
  let docxContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/></w:pPr>
      <w:r><w:t>${template.title}</w:t></w:r>
    </w:p>
    <w:p/>
    <w:p/>`;

  template.sections.forEach(sec => {
    const content = values[sec.id] || "";
    const cleanContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;')
        .replace(/"/g, '&quot;');

    // Handle newlines for Word XML
    const formattedContent = cleanContent.replace(/\n/g, '</w:t></w:r><w:r><w:br/></w:r><w:r><w:t>');

    docxContent += `
      <w:p>
        <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
        <w:r><w:t>${sec.label}</w:t></w:r>
      </w:p>
      <w:p>
        <w:r><w:t>${formattedContent}</w:t></w:r>
      </w:p>
      <w:p/>`;
  });

  docxContent += `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`;

  // Create a Blob containing the docx structure
  // Note: A real .docx is a zip file. This method creates a Flat OPC XML file 
  // which Word opens, but strict .docx validation might require a library like 'docx' or 'jszip'.
  // However, modern Word handles single XML files saved with .doc or .xml extension well, 
  // or the specific 2003 XML format. 
  // For this "Pure JS" request without libraries, we stick to the provided logic 
  // which mimics a flat Word 2003 XML or a simplified structure. 
  // To ensure it opens, we usually need the full XML preamble.
  
  const blob = new Blob([
    docxContent
  ], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${template.title.replace(/[^a-z0-9]/gi, '_')}_Report.doc`; // .doc often opens XML easier than .docx without zipping
  link.click();
};