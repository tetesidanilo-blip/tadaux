import { Section, Question } from "@/hooks/useSurveyState";

export const getQuestionIcon = (type: string) => {
  switch (type) {
    case "multiple_choice":
      return "○";
    case "checkbox":
      return "☐";
    case "short_answer":
      return "___";
    case "paragraph":
      return "¶";
    case "dropdown":
      return "▼";
    default:
      return "?";
  }
};

export const getAllQuestions = (sections: Section[]) => {
  return sections.flatMap(s => s.questions);
};

const mapQuestionType = (type: string) => {
  switch (type) {
    case "multiple_choice":
      return "Multiple choice";
    case "checkbox":
      return "Checkboxes";
    case "short_answer":
      return "Short answer";
    case "paragraph":
      return "Paragraph";
    case "dropdown":
      return "Dropdown";
    default:
      return "Short answer";
  }
};

const typeLabels: { [key: string]: string } = {
  'short_answer': 'Risposta breve',
  'paragraph': 'Paragrafo',
  'multiple_choice': 'Scelta multipla',
  'checkbox': 'Checkbox',
  'dropdown': 'Menu a tendina'
};

export const exportToCSV = (
  sections: Section[],
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void
) => {
  const defaultFileName = sections[0]?.name || "questionario";
  const fileName = prompt("Inserisci il nome del file:", defaultFileName);
  if (!fileName) return;

  const allQuestions = getAllQuestions(sections);

  const maxOptions = Math.max(...allQuestions.map(q => q.options?.length || 0), 0);
  const optionHeaders = Array.from({ length: maxOptions }, (_, i) => `Option ${i + 1}`);
  const headers = ["Section", "Question", "Type", "Required", ...optionHeaders];

  const rows = allQuestions.map(q => {
    const row = [
      `"${(q.section || "").replace(/"/g, '""')}"`,
      `"${q.question.replace(/"/g, '""')}"`,
      mapQuestionType(q.type),
      q.required ? "Yes" : "No",
      ...(q.options || []).map(opt => `"${opt.replace(/"/g, '""')}"`),
    ];
    while (row.length < headers.length) {
      row.push("");
    }
    return row.join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: "CSV esportato",
    description: "Importalo in Google Forms",
  });
};

export const exportToWord = (
  sections: Section[],
  toast: (opts: { title: string; description?: string }) => void
) => {
  const defaultFileName = sections[0]?.name || "questionario";
  const fileName = prompt("Inserisci il nome del file:", defaultFileName);
  if (!fileName) return;

  let content = `QUESTIONARIO GENERATO\n\n`;

  sections.forEach((section, sectionIndex) => {
    content += `${'='.repeat(50)}\n`;
    content += `SEZIONE: ${section.name}\n`;
    content += `${'='.repeat(50)}\n\n`;

    section.questions.forEach((q, qIndex) => {
      const questionNumber = sectionIndex * 100 + qIndex + 1;
      content += `${questionNumber}. ${q.question}`;
      content += ` (${typeLabels[q.type] || q.type})`;
      if (q.required) content += ` *OBBLIGATORIA`;
      content += `\n`;

      if (q.options && q.options.length > 0) {
        q.options.forEach((opt) => {
          const symbol = q.type === 'checkbox' ? '☐' : '○';
          content += `   ${symbol} ${opt}\n`;
        });
      }
      content += `\n`;
    });
    content += `\n`;
  });

  const blob = new Blob([content], { type: "application/msword;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.doc`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: "Export completato",
    description: "Documento Word scaricato con successo",
  });
};

export const exportToPDF = async (
  sections: Section[],
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void
) => {
  const defaultFileName = sections[0]?.name || "questionario";
  const fileName = prompt("Inserisci il nome del file:", defaultFileName);
  if (!fileName) return;

  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const maxWidth = 170;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('QUESTIONARIO GENERATO', margin, yPosition);
    yPosition += 20;

    sections.forEach((section, sectionIndex) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const sectionLines = doc.splitTextToSize(`SEZIONE: ${section.name}`, maxWidth);
      sectionLines.forEach((line: string) => {
        doc.text(line, margin, yPosition);
        yPosition += 7;
      });
      yPosition += 8;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      section.questions.forEach((q, qIndex) => {
        const questionNumber = sectionIndex * 100 + qIndex + 1;

        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'bold');
        const questionText = `${questionNumber}. ${q.question} (${typeLabels[q.type] || q.type})${q.required ? ' *OBB.' : ''}`;
        const questionLines = doc.splitTextToSize(questionText, maxWidth);
        questionLines.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += 6;
        });
        yPosition += 5;

        doc.setFont('helvetica', 'normal');
        if (q.options && q.options.length > 0) {
          q.options.forEach((opt) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }
            const symbol = q.type === 'checkbox' ? '[ ]' : '( )';
            const optionText = `   ${symbol} ${opt}`;
            const optionLines = doc.splitTextToSize(optionText, maxWidth - 5);
            optionLines.forEach((line: string) => {
              doc.text(line, margin + 8, yPosition);
              yPosition += 6;
            });
          });
        }
        yPosition += 3;
      });
      yPosition += 5;
    });

    doc.save(`${fileName}.pdf`);

    toast({
      title: "Export completato",
      description: "PDF scaricato con successo",
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast({
      title: "Errore",
      description: "Impossibile generare il PDF",
      variant: "destructive",
    });
  }
};
