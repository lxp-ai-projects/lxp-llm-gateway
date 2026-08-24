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
  es: {
    title: 'Laboratorio de evaluación',
    profile: 'Perfil',
    preset: 'Ejemplo / preajuste',
    input: 'Solicitud de evaluación',
    run: 'Ejecutar evaluación',
    result: 'Resultado de la evaluación',
    evidence: 'Evidencia',
    latency: 'Latencia',
    evaluationId: 'ID de evaluación',
    unavailable:
      'El proveedor de evaluación configurado no está disponible temporalmente.',
    timeout: 'La evaluación agotó el tiempo de espera.',
    invalidOutput: 'El proveedor devolvió evidencia estructurada no válida.',
    unauthorized: 'No tienes autorización para ejecutar pruebas de evaluación.',
  },
  de: {
    title: 'Evaluierungslabor',
    profile: 'Profil',
    preset: 'Beispiel / Voreinstellung',
    input: 'Evaluierungsanfrage',
    run: 'Evaluierung ausführen',
    result: 'Evaluierungsergebnis',
    evidence: 'Nachweise',
    latency: 'Latenz',
    evaluationId: 'Evaluierungs-ID',
    unavailable:
      'Der konfigurierte Evaluierungsanbieter ist vorübergehend nicht verfügbar.',
    timeout: 'Zeitüberschreitung bei der Evaluierung.',
    invalidOutput:
      'Der Anbieter hat ungültige strukturierte Nachweise zurückgegeben.',
    unauthorized:
      'Sie sind nicht berechtigt, Evaluierungsprüfungen auszuführen.',
  },
} as const;

export function getEvaluationLabCopy(language?: string) {
  const locale = language?.toLowerCase().split(/[-_]/)[0];
  return copy[
    locale === 'fr' || locale === 'es' || locale === 'de' ? locale : 'en'
  ];
}
