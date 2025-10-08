import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "it";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Hero
    heroTitle: "AI-Powered Survey Generator",
    heroSubtitle: "Transform your ideas or documents into professional Google Forms surveys in seconds. Let AI do the heavy lifting.",
    getStarted: "Get Started Free",
    lightningFast: "Lightning Fast",
    lightningFastDesc: "Generate complete surveys in seconds with AI",
    documentToSurvey: "Document to Survey",
    documentToSurveyDesc: "Upload Word or PDF documents to auto-generate surveys",
    readyForGoogleForms: "Ready for Google Forms",
    readyForGoogleFormsDesc: "Export-ready format for seamless integration",
    
    // Survey Generator
    backToHome: "Back to Home",
    createYourSurvey: "Create Your Survey",
    surveyDescription: "Generate questions by section and build your complete survey",
    sections: "sections",
    section: "section",
    totalQuestions: "total questions",
    surveyLanguage: "Survey Language",
    sectionName: "Section Name",
    sectionNamePlaceholder: "Example: Personal Information, Customer Satisfaction, Product Feedback...",
    questionDescription: "Question Description",
    questionDescriptionPlaceholder: "Example: Create questions about product quality, delivery speed and customer service...",
    uploadDocument: "Upload Document",
    chooseFile: "Choose File",
    clear: "Clear",
    supportsFiles: "Supports PDF, Word documents and CSV files",
    csvImported: "CSV Imported",
    imported: "imported",
    invalidCSV: "Invalid CSV",
    csvMustHaveData: "CSV file must contain data",
    invalidCSVFormat: "Invalid CSV Format",
    csvMissingColumns: "CSV must have Section, Question, and Type columns",
    importFailed: "Import Failed",
    failedToImportCSV: "Failed to import CSV file",
    generateFirstSection: "Generate First Section",
    addNewSection: "Add New Section",
    generating: "Generating...",
    yourSurvey: "Your Survey",
    downloadCSV: "Download CSV",
    clearAll: "Clear All",
    removeSection: "Remove Section",
    question: "Question",
    type: "Type",
    multipleChoice: "Multiple choice",
    checkboxes: "Checkboxes",
    shortAnswer: "Short answer",
    paragraph: "Paragraph",
    dropdown: "Dropdown",
    required: "Required",
    options: "Options",
    addOption: "Add Option",
    save: "Save",
    
    // Toast messages
    fileUploaded: "File uploaded",
    fileReady: "is ready to be processed",
    invalidFileType: "Invalid file type",
    uploadPDFOrWord: "Please upload a PDF or Word document",
    inputRequired: "Input required",
    provideDescription: "Please provide a description or upload a document",
    sectionNameRequired: "Section name required",
    provideSectionName: "Please provide a name for this section",
    sectionAdded: "Section added!",
    questionsAdded: "questions added to",
    generationFailed: "Generation failed",
    failedToGenerate: "Failed to generate survey. Please try again.",
    csvExported: "CSV exported!",
    importToGoogleForms: "Import this file into Google Forms",
    sectionRemoved: "Section removed",
    hasBeenRemoved: "has been removed",
    allSectionsCleared: "All sections cleared",
    surveyReset: "Survey has been reset",
    questionUpdated: "Question updated",
    changesSaved: "Changes have been saved",
    questionDeleted: "Question deleted",
    questionRemoved: "Question has been removed",
    feedbackLabel: "Feedback for this question",
    feedbackPlaceholder: "Example: Make this question more specific, add more options, change the wording...",
    feedbackHelp: "This feedback helps you understand how questions should be modified and can be used as a model for other questions.",
    feedbackSaved: "Feedback saved",
    feedbackSavedDesc: "Your feedback has been saved for this question",
    generateMore: "Generate more questions",
    newQuestionsAdded: "new questions added to this section",
    applyFeedback: "Apply Feedback",
    extendToOthers: "Extend to Other Questions",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    questionsSelected: "questions selected",
    applying: "Applying...",
    applyingFeedback: "Applying feedback...",
    feedbackApplied: "Feedback applied",
    feedbackAppliedDesc: "The questions have been regenerated",
    cancel: "Cancel",
    noFeedback: "No feedback",
    noFeedbackDesc: "Please add feedback before applying",
    questionsUpdated: "questions updated",
    sourceQuestion: "Source",
    newSectionName: "New Section Name",
    addSection: "Add Section",
    hasBeenCreated: "has been created",
    newSectionDialogDesc: "Generate a new section with AI by providing a title and topic.",
    generateSection: "Generate Section",
  },
  it: {
    // Hero
    heroTitle: "Generatore di Sondaggi con IA",
    heroSubtitle: "Trasforma le tue idee o documenti in sondaggi professionali per Google Forms in pochi secondi. Lascia che l'IA faccia il lavoro pesante.",
    getStarted: "Inizia Gratis",
    lightningFast: "Velocissimo",
    lightningFastDesc: "Genera sondaggi completi in pochi secondi con l'IA",
    documentToSurvey: "Da Documento a Sondaggio",
    documentToSurveyDesc: "Carica documenti Word o PDF per generare automaticamente sondaggi",
    readyForGoogleForms: "Pronto per Google Forms",
    readyForGoogleFormsDesc: "Formato pronto per l'esportazione e l'integrazione perfetta",
    
    // Survey Generator
    backToHome: "Torna alla Home",
    createYourSurvey: "Crea il Tuo Sondaggio",
    surveyDescription: "Genera domande per sezione e costruisci il tuo questionario completo",
    sections: "sezioni",
    section: "sezione",
    totalQuestions: "domande totali",
    surveyLanguage: "Lingua del Questionario",
    sectionName: "Nome Sezione",
    sectionNamePlaceholder: "Esempio: Informazioni personali, Soddisfazione del cliente, Feedback sul prodotto...",
    questionDescription: "Descrizione Domande",
    questionDescriptionPlaceholder: "Esempio: Crea domande sulla qualità del prodotto, velocità di consegna e servizio clienti...",
    uploadDocument: "Carica Documento",
    chooseFile: "Scegli File",
    clear: "Cancella",
    supportsFiles: "Supporta file PDF, Word e CSV",
    csvImported: "CSV Importato",
    imported: "importate",
    invalidCSV: "CSV Non Valido",
    csvMustHaveData: "Il file CSV deve contenere dati",
    invalidCSVFormat: "Formato CSV Non Valido",
    csvMissingColumns: "Il CSV deve avere le colonne Section, Question e Type",
    importFailed: "Importazione Fallita",
    failedToImportCSV: "Impossibile importare il file CSV",
    generateFirstSection: "Genera Prima Sezione",
    addNewSection: "Aggiungi Nuova Sezione",
    generating: "Generazione in corso...",
    yourSurvey: "Il Tuo Questionario",
    downloadCSV: "Scarica CSV",
    clearAll: "Cancella Tutto",
    removeSection: "Rimuovi Sezione",
    question: "Domanda",
    type: "Tipo",
    multipleChoice: "Scelta multipla",
    checkboxes: "Caselle di controllo",
    shortAnswer: "Risposta breve",
    paragraph: "Paragrafo",
    dropdown: "Menu a discesa",
    required: "Obbligatorio",
    options: "Opzioni",
    addOption: "Aggiungi Opzione",
    save: "Salva",
    
    // Toast messages
    fileUploaded: "File caricato",
    fileReady: "è pronto per essere elaborato",
    invalidFileType: "Tipo di file non valido",
    uploadPDFOrWord: "Carica un documento PDF o Word",
    inputRequired: "Input richiesto",
    provideDescription: "Fornisci una descrizione o carica un documento",
    sectionNameRequired: "Nome sezione richiesto",
    provideSectionName: "Fornisci un nome per questa sezione",
    sectionAdded: "Sezione aggiunta!",
    questionsAdded: "domande aggiunte a",
    generationFailed: "Generazione fallita",
    failedToGenerate: "Impossibile generare il sondaggio. Riprova.",
    csvExported: "CSV esportato!",
    importToGoogleForms: "Importa questo file in Google Forms",
    sectionRemoved: "Sezione rimossa",
    hasBeenRemoved: "è stata rimossa",
    allSectionsCleared: "Tutte le sezioni cancellate",
    surveyReset: "Il sondaggio è stato resettato",
    questionUpdated: "Domanda aggiornata",
    changesSaved: "Le modifiche sono state salvate",
    questionDeleted: "Domanda eliminata",
    questionRemoved: "La domanda è stata rimossa",
    feedbackLabel: "Feedback per questa domanda",
    feedbackPlaceholder: "Esempio: Rendi questa domanda più specifica, aggiungi più opzioni, cambia la formulazione...",
    feedbackHelp: "Questo feedback ti aiuta a capire come le domande dovrebbero essere modificate e può essere usato come modello per altre domande.",
    feedbackSaved: "Feedback salvato",
    feedbackSavedDesc: "Il tuo feedback è stato salvato per questa domanda",
    generateMore: "Genera altre domande",
    newQuestionsAdded: "nuove domande aggiunte a questa sezione",
    applyFeedback: "Applica Feedback",
    extendToOthers: "Estendi ad Altre Domande",
    selectAll: "Seleziona Tutto",
    deselectAll: "Deseleziona Tutto",
    questionsSelected: "domande selezionate",
    applying: "Applicazione...",
    applyingFeedback: "Applicazione feedback...",
    feedbackApplied: "Feedback applicato",
    feedbackAppliedDesc: "Le domande sono state rigenerate",
    cancel: "Annulla",
    noFeedback: "Nessun feedback",
    noFeedbackDesc: "Aggiungi un feedback prima di applicarlo",
    questionsUpdated: "domande aggiornate",
    sourceQuestion: "Sorgente",
    newSectionName: "Nome Nuova Sezione",
    addSection: "Aggiungi Sezione",
    hasBeenCreated: "è stata creata",
    newSectionDialogDesc: "Genera una nuova sezione con l'AI fornendo un titolo e un argomento.",
    generateSection: "Genera Sezione",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};