export const de = {
  common: {
    actions: {
      cancel: 'Abbrechen',
      close: 'Schließen',
      confirm: 'Bestätigen',
      copy: 'Kopieren',
      copied: 'Kopiert',
      delete: 'Löschen',
      install: 'App installieren',
      logout: 'Abmelden',
      save: 'Speichern',
      submit: 'Senden',
    },
    activeTenant: 'Aktiver Tenant: {{tenant}}',
    controlPlane: 'Steuerungsebene',
    language: { label: 'Sprache', select: 'Sprache auswählen' },
    loading: 'Wird geladen...',
    status: {
      active: 'Aktiv',
      disabled: 'Deaktiviert',
      live: 'Live',
      unavailable: 'Nicht verfügbar',
    },
  },
  auth: {
    brand: {
      badge: 'LXP-Gateway',
      title: 'Ein klarerer Weg von der Absicht zur Intelligenz.',
      description:
        'Ein fokussierter Arbeitsbereich zur Verwaltung von Modellzugriffen, Anmeldedaten und den Systemen, auf die sich Ihr Team verlässt.',
      secureAccess: 'Sicherer Arbeitsbereichszugriff',
    },
    login: {
      kicker: 'Sichere Anmeldung',
      title: 'Willkommen zurück',
      description:
        'Melden Sie sich an, um mit Ihrem LXP-Arbeitsbereich fortzufahren.',
      failed: 'Anmeldung fehlgeschlagen',
      genericFailure:
        'Authentifizierung mit den aktuellen Anmeldedaten nicht möglich.',
      email: 'E-Mail',
      emailPlaceholder: 'email@domain.de',
      password: 'Passwort',
      passwordPlaceholder: 'Ihr Passwort',
      acceptPrefix: 'Ich akzeptiere die',
      terms: 'Nutzungsbedingungen',
      conjunction: 'und die',
      privacy: 'Datenschutzerklärung',
      submit: 'Anmelden',
      createAccount: 'Konto erstellen',
      registrationDisabled: 'Registrierung deaktiviert',
      forgotPassword: 'Passwort vergessen',
      recoveryDisabled: 'Wiederherstellung deaktiviert',
    },
    session: {
      expired: 'Sitzung abgelaufen',
      restoring: 'Sichere Sitzung wird wiederhergestellt...',
      unavailable: 'Sitzungsprofil nicht verfügbar',
    },
    denied: {
      title: 'Eingeschränkter Bereich',
      alertTitle: 'Administratorzugriff erforderlich',
      description:
        'Ihre aktuelle Rolle erlaubt keinen Zugriff auf diesen Bereich.',
    },
    roles: {
      superAdmin: 'Superadministrator',
      tenantAdmin: 'Tenant-Administrator',
      user: 'Benutzer',
    },
  },
  navigation: {
    overview: 'Übersicht',
    providerTokens: 'Provider-Token',
    profile: 'Profil',
    chatLab: 'Chat-Labor',
    imageLab: 'Bildlabor',
    videoLab: 'Videolabor',
    evaluationLab: 'Evaluierungslabor',
    users: 'Benutzer',
    tenants: 'Tenants',
    analytics: 'Analysen',
    health: 'Systemstatus',
    groups: {
      workspace: 'Arbeitsbereich',
      tenantAdmin: 'Tenant-Verwaltung',
      global: 'Globale Steuerungsebene',
    },
    enterpriseControlPlane: 'Unternehmenssteuerung',
    workspaceFallback: 'Arbeitsbereich',
    gatewayOnline: 'Gateway online',
    gatewayOffline: 'Gateway offline',
    securityTitle: 'Sicherheitsstatus',
    securityDescription:
      'Reine Browser-Cookie-Authentifizierung, verschlüsselte Provider-Geheimnisse und rollenbasierte Navigation.',
  },
  errors: {
    generic: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    authenticationRequired:
      'Eine Authentifizierung ist erforderlich. Bitte melden Sie sich an.',
    permissionDenied: 'Sie sind zu dieser Aktion nicht berechtigt.',
    networkUnavailable:
      'Der Dienst ist nicht erreichbar. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
    serverFailure:
      'Der Server konnte die Anfrage nicht abschließen. Bitte versuchen Sie es erneut.',
    sessionExpired:
      'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
    credentialConflict:
      'Für diesen Provider ist bereits eine Anmeldeinformation vorhanden.',
    validation: 'Prüfen Sie die markierten Werte und versuchen Sie es erneut.',
    route: {
      title: 'Anwendungsfehler',
      description:
        'Die Seite konnte nicht vollständig geladen werden. Dies tritt häufig auf, wenn lokale Entwicklungsserver nicht laufen oder unerwartete Ports verwenden.',
      details: 'Details',
      unexpected: 'Ein unerwarteter Anwendungsfehler ist aufgetreten.',
      ports:
        'Prüfen Sie, ob gateway-api Port 3001, admin-api Port 3002 und admin-web Port 3003 verwendet, und laden Sie die Seite neu.',
      return: 'Zum Anwendungseinstieg zurückkehren',
    },
  },
  pages: {
    dashboard: {
      title: 'Übersicht',
      description:
        'Eine SPA, rollenbasierte Navigation und eine klare Trennung zwischen Selbstbedienung und administrativen Kontrollen.',
      session: 'Sitzung',
      authenticated: 'Authentifiziert',
      unavailable: 'Nicht verfügbar',
      authPosture: 'Authentifizierungsmodell',
      cookieOnly: 'Nur Cookies',
      gateway: 'Gateway',
      online: 'Online',
      offline: 'Offline',
      roleSurface: 'Rollenumfang',
      superAdminSurface: 'Superadministrator + Tenant + Benutzer',
      tenantAdminSurface: 'Tenant-Administrator + Benutzer',
      userSurface: 'Nur Benutzer',
      registration: 'Registrierung',
      enabled: 'Aktiviert',
      disabled: 'Deaktiviert',
      breakerTitle: 'Der Gateway-Schutzschalter ist aktiv',
      breakerDescription:
        'Chat-Anfragen erhalten eine Offline-Antwort, bis ein Administrator das Gateway wieder aktiviert.',
    },
    health: {
      title: 'Systemstatus',
      description: 'Betriebsstatus der beiden ursprünglichen Plattformebenen.',
      checking: 'Wird geprüft...',
      unavailable: 'Nicht verfügbar',
      unknown: 'Unbekannt',
    },
    legal: {
      back: 'Zurück zur Anmeldung',
      termsKicker: 'Bedingungen',
      termsTitle: 'Nutzungsbedingungen',
      termsDescription:
        'Diese vorläufige Seite bietet die korrekte rechtliche Navigation, während die formalen Texte fertiggestellt werden.',
      termsCredential:
        'Die Nutzung von Provider-Anmeldedaten unterliegt den Plattformrichtlinien.',
      termsAdmin:
        'Administrative Aktionen sind rollengebunden und nachvollziehbar.',
      termsGateway:
        'Der Gateway-Zugriff kann durch einen globalen Schutzschalter unterbrochen werden.',
      privacyKicker: 'Datenschutz',
      privacyTitle: 'Datenschutzkonzept',
      privacyDescription:
        'Diese vorläufige Seite beschreibt die Backend-Sicherheit: verschlüsselte Provider-Anmeldedaten, gehashte Identitätskorrelation und reine Cookie-Authentifizierung.',
      privacySecrets:
        'Provider-API-Geheimnisse werden im Ruhezustand verschlüsselt.',
      privacySessions:
        'Browsersitzungen vermeiden die Offenlegung von Token gegenüber JavaScript.',
      privacyIdentity:
        'Die Identitätsauflösung für Gateway-Verkehr verwendet emailHash.',
    },
    pending: {
      registrationKicker: 'Registrierung',
      registrationTitle: 'Konto erstellen',
      recoveryKicker: 'Kontowiederherstellung',
      recoveryTitle: 'Passwort vergessen',
      recoveryDescription:
        'Diese Route wird durch die Backend-Laufzeitkonfiguration gesteuert.',
      backendFlow: 'Backend-Ablauf ausstehend',
      backendEndpoint: 'Backend-Endpunkt ausstehend',
      registrationPending:
        'Die Selbstregistrierung ist aktiviert, der Backend-Ablauf muss jedoch noch implementiert werden.',
      recoveryPending:
        'Die Oberfläche ist bereit, der Backend-Ablauf zur Passwortwiederherstellung ist jedoch noch nicht implementiert.',
      disabledTitle: 'Durch Konfiguration deaktiviert',
      registrationDisabled:
        'Die Registrierung ist für diese Bereitstellung deaktiviert.',
      recoveryDisabled:
        'Die Passwortwiederherstellung ist für diese Bereitstellung deaktiviert.',
    },
    providers: {
      title: 'Provider-Anmeldedaten',
      description:
        'Verwalten Sie nur schreibbare Provider-Anmeldedaten, die Administratoren setzen, aber nicht zurücklesen können, sowie separate Provider-/Modellpaare für Chat und Bilder.',
      boundaryTitle: 'Hinweis zur Sicherheitsgrenze',
      boundaryDescription:
        'Administratoren können Anmeldedaten anderer Benutzer erstellen oder zurücksetzen, dürfen aber nur die maskierte Fassung und niemals das Roh-Token sehen.',
    },
    users: {
      title: 'Benutzerverwaltung',
      description:
        'Administrative Funktionen für Suche, Lebenszyklus, Rollenzuweisung und Passwortzurücksetzung.',
      create: 'Benutzer erstellen',
      dependencyTitle: 'Backend-Abhängigkeit',
      dependencyDescription:
        'Benutzerliste und grundlegender Lebenszyklus sind verbunden. Rollenzuweisung, Seitennavigation, Administratorübertragung und Passwortrücksetzung benötigen weitere Backend-Unterstützung.',
    },
    image: {
      title: 'Bildgenerierungslabor',
      description:
        'Erzeugen, bearbeiten, speichern und verwenden Sie Bilder im Gateway-verwalteten Workflow erneut.',
    },
    video: {
      title: 'Videogenerierungslabor',
      description:
        'Erstellen, verfolgen, übernehmen, prüfen und laden Sie Gateway-verwaltete Videoaufträge herunter.',
    },
  },
} as const;
