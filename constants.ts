import { TemplatesMap } from './types';

export const TEMPLATES: TemplatesMap = {
  pfe: {
    id: 'pfe',
    title: "Projet de Fin d'Études (PFE)",
    description: "Structure standard for Final Year Projects including analysis, design, and realization.",
    sections: [
      { id: "title", label: "Titre du Projet", type: "text", required: true },
      { id: "authors", label: "Auteurs", type: "text", required: true },
      { id: "acknowledgment", label: "Remerciements", type: "textarea" },
      { id: "abstract", label: "Résumé / Abstract", type: "textarea", aiPrompt: "Write a professional abstract summarizing a technical project about..." },
      { id: "introduction", label: "Introduction", type: "textarea" },
      { id: "problem", label: "Problématique", type: "textarea", aiPrompt: "Define a clear problem statement for..." },
      { id: "objectives", label: "Objectifs", type: "textarea" },
      { id: "state_of_art", label: "État de l'art", type: "textarea" },
      { id: "needs", label: "Analyse des besoins", type: "textarea" },
      { id: "design", label: "Conception", type: "textarea" },
      { id: "realization", label: "Réalisation", type: "textarea" },
      { id: "testing", label: "Tests et validation", type: "textarea" },
      { id: "conclusion", label: "Conclusion", type: "textarea" },
      { id: "perspectives", label: "Perspectives", type: "textarea" },
      { id: "bibliography", label: "Bibliographie", type: "textarea" },
      { id: "annexes", label: "Annexes", type: "textarea" }
    ]
  },
  internship: {
    id: 'internship',
    title: "Rapport de Stage",
    description: "Template for internship reports focusing on company presentation and tasks performed.",
    sections: [
      { id: "title", label: "Titre du Stage", type: "text", required: true },
      { id: "student", label: "Étudiant", type: "text", required: true },
      { id: "company", label: "Entreprise", type: "text", required: true },
      { id: "supervisor", label: "Maître de Stage", type: "text" },
      { id: "acknowledgment", label: "Remerciements", type: "textarea" },
      { id: "abstract", label: "Résumé", type: "textarea" },
      { id: "introduction", label: "Introduction", type: "textarea" },
      { id: "company_pres", label: "Présentation de l'entreprise", type: "textarea" },
      { id: "missions", label: "Missions effectuées", type: "textarea", aiPrompt: "Describe the daily tasks and specific missions of a software engineering intern..." },
      { id: "problems", label: "Problématiques rencontrées", type: "textarea" },
      { id: "solutions", label: "Solutions apportées", type: "textarea" },
      { id: "skills", label: "Compétences acquises", type: "textarea" },
      { id: "conclusion", label: "Conclusion", type: "textarea" },
      { id: "annexes", label: "Annexes", type: "textarea" }
    ]
  },
  research: {
    id: 'research',
    title: "Article de Recherche",
    description: "Academic paper format suitable for conferences and journals.",
    sections: [
      { id: "title", label: "Title", type: "text", required: true },
      { id: "authors", label: "Authors", type: "text", required: true },
      { id: "abstract", label: "Abstract", type: "textarea", aiPrompt: "Write an academic abstract for a paper about..." },
      { id: "keywords", label: "Keywords", type: "text" },
      { id: "introduction", label: "Introduction", type: "textarea" },
      { id: "related_work", label: "Related Work", type: "textarea" },
      { id: "methodology", label: "Methodology", type: "textarea" },
      { id: "results", label: "Results", type: "textarea" },
      { id: "discussion", label: "Discussion", type: "textarea" },
      { id: "conclusion", label: "Conclusion", type: "textarea" },
      { id: "references", label: "References", type: "textarea" }
    ]
  },
  mini_project: {
    id: 'mini_project',
    title: "Mini-Projet",
    description: "Simplified structure for course projects and smaller assignments.",
    sections: [
      { id: "title", label: "Titre du Projet", type: "text", required: true },
      { id: "student", label: "Étudiant", type: "text" },
      { id: "introduction", label: "Introduction", type: "textarea" },
      { id: "objectives", label: "Objectifs", type: "textarea" },
      { id: "specs", label: "Cahier des charges", type: "textarea" },
      { id: "design", label: "Conception", type: "textarea" },
      { id: "realization", label: "Réalisation", type: "textarea" },
      { id: "tests", label: "Tests", type: "textarea" },
      { id: "conclusion", label: "Conclusion", type: "textarea" },
      { id: "bibliography", label: "Bibliographie", type: "textarea" }
    ]
  }
};