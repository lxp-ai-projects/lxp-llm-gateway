const copy = {
  en: {
    title: 'Evaluation Lab',
    profile: 'Profile',
    preset: 'Example / preset',
    input: 'Evaluation request',
    run: 'Run evaluation',
    result: 'Evaluation result',
    evidence: 'Evidence',
    latency: 'Latency',
    evaluationId: 'Evaluation ID',
    unavailable:
      'The configured evaluator provider is temporarily unavailable.',
    timeout: 'The evaluation timed out.',
    invalidOutput: 'The provider returned invalid structured evidence.',
    unauthorized: 'You are not authorized to execute evaluation probes.',
  },
  fr: {
    title: "Laboratoire d'évaluation",
    profile: 'Profil',
    preset: 'Exemple / préréglage',
    input: "Requête d'évaluation",
    run: "Lancer l'évaluation",
    result: "Résultat de l'évaluation",
    evidence: 'Éléments de preuve',
    latency: 'Latence',
    evaluationId: "ID d'évaluation",
    unavailable:
      "Le fournisseur d'évaluation configuré est temporairement indisponible.",
    timeout: "L'évaluation a expiré.",
    invalidOutput:
      'Le fournisseur a retourné des éléments de preuve structurés invalides.',
    unauthorized:
      "Vous n'êtes pas autorisé à exécuter des sondes d'évaluation.",
  },
} as const;

export function getEvaluationLabCopy(language?: string) {
  return copy[language?.toLowerCase().startsWith('fr') ? 'fr' : 'en'];
}
