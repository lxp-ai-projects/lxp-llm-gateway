export const fr = {
  common: {
    actions: {
      cancel: 'Annuler',
      close: 'Fermer',
      confirm: 'Confirmer',
      delete: 'Supprimer',
      install: "Installer l'application",
      logout: 'Se déconnecter',
      save: 'Enregistrer',
      submit: 'Envoyer',
    },
    activeTenant: 'Tenant actif : {{tenant}}',
    controlPlane: 'Plan de contrôle',
    language: { label: 'Langue', select: 'Choisir la langue' },
    loading: 'Chargement...',
    status: {
      active: 'Actif',
      disabled: 'Désactivé',
      unavailable: 'Indisponible',
    },
  },
  auth: {
    brand: {
      badge: 'Passerelle LXP',
      title: "Un chemin plus clair de l'intention à l'intelligence.",
      description:
        "Un espace de travail ciblé pour gérer l'accès aux modèles, les identifiants et les systèmes dont votre équipe dépend.",
      secureAccess: "Accès sécurisé à l'espace de travail",
    },
    login: {
      kicker: 'Connexion sécurisée',
      title: 'Bon retour',
      description: 'Connectez-vous pour accéder à votre espace LXP.',
      failed: 'Échec de la connexion',
      genericFailure: 'Impossible de vous authentifier avec ces identifiants.',
      email: 'Adresse courriel',
      emailPlaceholder: 'adresse@domaine.com',
      password: 'Mot de passe',
      passwordPlaceholder: 'Votre mot de passe',
      acceptPrefix: "J'accepte les",
      terms: "conditions d'utilisation",
      conjunction: 'et la',
      privacy: 'politique de confidentialité',
      submit: 'Se connecter',
      createAccount: 'Créer un compte',
      registrationDisabled: 'Inscription désactivée',
      forgotPassword: 'Mot de passe oublié',
      recoveryDisabled: 'Récupération désactivée',
    },
    session: {
      expired: 'Session expirée',
      restoring: 'Restauration de la session sécurisée...',
      unavailable: 'Profil de session indisponible',
    },
    denied: {
      title: 'Zone restreinte',
      alertTitle: 'Accès administrateur requis',
      description: "Votre rôle actuel ne permet pas d'accéder à cette section.",
    },
    roles: {
      superAdmin: 'Super administrateur',
      tenantAdmin: 'Administrateur du tenant',
      user: 'Utilisateur',
    },
  },
  navigation: {
    overview: "Vue d'ensemble",
    providerTokens: 'Jetons fournisseur',
    profile: 'Profil',
    chatLab: 'Laboratoire de clavardage',
    imageLab: "Laboratoire d'images",
    videoLab: 'Laboratoire vidéo',
    evaluationLab: "Laboratoire d'évaluation",
    users: 'Utilisateurs',
    tenants: 'Tenants',
    analytics: 'Analytique',
    health: 'État des services',
    groups: {
      workspace: 'Espace de travail',
      tenantAdmin: 'Administration du tenant',
      global: 'Plan de contrôle global',
    },
    enterpriseControlPlane: "Plan de contrôle d'entreprise",
    workspaceFallback: 'Espace de travail',
    gatewayOnline: 'Passerelle en ligne',
    gatewayOffline: 'Passerelle hors ligne',
    securityTitle: 'Posture de sécurité',
    securityDescription:
      'Authentification par témoins de navigateur, secrets fournisseur chiffrés et navigation adaptée aux rôles.',
  },
  errors: {
    generic: 'Une erreur est survenue. Veuillez réessayer.',
    authenticationRequired:
      'Une authentification est requise. Veuillez vous connecter.',
    permissionDenied: "Vous n'avez pas la permission d'effectuer cette action.",
    networkUnavailable:
      'Le service est indisponible. Vérifiez votre connexion et réessayez.',
    serverFailure:
      "Le serveur n'a pas pu traiter la demande. Veuillez réessayer.",
    sessionExpired: 'Votre session a expiré. Veuillez vous reconnecter.',
    credentialConflict: 'Un identifiant existe déjà pour ce fournisseur.',
    validation: 'Vérifiez les valeurs indiquées et réessayez.',
    route: {
      title: "Erreur d'application",
      description:
        "La page n'a pas pu terminer son chargement. Cela arrive souvent lorsque les serveurs de développement locaux sont arrêtés ou utilisent des ports inattendus.",
      details: 'Détails',
      unexpected: "Une erreur d'application inattendue est survenue.",
      ports:
        'Vérifiez que gateway-api utilise le port 3001, admin-api le port 3002 et admin-web le port 3003, puis rechargez la page.',
      return: "Revenir au point d'entrée de l'application",
    },
  },
  pages: {
    dashboard: {
      title: "Vue d'ensemble",
      description:
        'Une application monopage, une navigation adaptée aux rôles et une séparation nette entre libre-service et contrôles administratifs.',
      session: 'Session',
      authenticated: 'Authentifiée',
      unavailable: 'Indisponible',
      authPosture: "Mode d'authentification",
      cookieOnly: 'Témoins uniquement',
      gateway: 'Passerelle',
      online: 'En ligne',
      offline: 'Hors ligne',
      roleSurface: 'Portée du rôle',
      superAdminSurface: 'Super administrateur + tenant + utilisateur',
      tenantAdminSurface: 'Administrateur du tenant + utilisateur',
      userSurface: 'Utilisateur uniquement',
      registration: 'Inscription',
      enabled: 'Activée',
      disabled: 'Désactivée',
      breakerTitle: 'Le coupe-circuit de la passerelle est actif',
      breakerDescription:
        "Le trafic de clavardage recevra une réponse de service hors ligne jusqu'à la réactivation de la passerelle.",
    },
    health: {
      title: 'État des services',
      description:
        'État opérationnel des deux plans initiaux exposés par la plateforme.',
      checking: 'Vérification...',
      unavailable: 'Indisponible',
      unknown: 'Inconnu',
    },
    legal: {
      back: 'Retour à la connexion',
      termsKicker: 'Conditions',
      termsTitle: "Conditions d'utilisation",
      termsDescription:
        'Cette page temporaire fournit la navigation juridique appropriée pendant la finalisation des textes officiels.',
      termsCredential:
        "L'utilisation des identifiants fournisseur reste soumise à la politique de la plateforme.",
      termsAdmin:
        'Les actions administratives sont liées aux rôles et auditables.',
      termsGateway:
        "L'accès à la passerelle peut être interrompu par un coupe-circuit global.",
      privacyKicker: 'Confidentialité',
      privacyTitle: 'Protection des renseignements',
      privacyDescription:
        "Cette page temporaire reflète les principes de sécurité du backend : identifiants fournisseur chiffrés, corrélation d'identité hachée et authentification par témoins.",
      privacySecrets:
        'Les secrets API des fournisseurs sont chiffrés au repos.',
      privacySessions:
        "Les sessions du navigateur évitent d'exposer les jetons à JavaScript.",
      privacyIdentity:
        "La résolution d'identité du trafic de la passerelle repose sur emailHash.",
    },
    pending: {
      registrationKicker: 'Inscription',
      registrationTitle: 'Créer un compte',
      recoveryKicker: 'Récupération du compte',
      recoveryTitle: 'Mot de passe oublié',
      recoveryDescription:
        "Cette route est contrôlée par la configuration d'exécution du backend.",
      backendFlow: 'Flux backend en attente',
      backendEndpoint: 'Point de terminaison backend en attente',
      registrationPending:
        "L'inscription autonome est activée, mais le flux backend reste à implémenter.",
      recoveryPending:
        "L'interface est prête, mais le flux backend de récupération reste à implémenter.",
      disabledTitle: 'Désactivé par la configuration',
      registrationDisabled:
        'Les inscriptions sont désactivées pour ce déploiement.',
      recoveryDisabled:
        'La récupération du mot de passe est désactivée pour ce déploiement.',
    },
    providers: {
      title: 'Identifiants fournisseur',
      description:
        'Gérez vos identifiants fournisseur confidentiels et choisissez des paires fournisseur/modèle distinctes pour le clavardage et les images.',
      boundaryTitle: 'Rappel de la frontière',
      boundaryDescription:
        "Les administrateurs peuvent créer ou réinitialiser l'identifiant fournisseur d'un autre utilisateur, mais ne doivent voir que sa version masquée, jamais le jeton brut.",
    },
    users: {
      title: 'Gestion des utilisateurs',
      description:
        'Contrôles administratifs de recherche, cycle de vie, attribution des rôles et réinitialisation des mots de passe.',
      create: 'Créer un utilisateur',
      dependencyTitle: 'Dépendance backend',
      dependencyDescription:
        "La liste et le cycle de vie de base sont connectés. La réattribution des rôles, la pagination, le transfert d'administration et la réinitialisation exigent encore du travail backend.",
    },
    image: {
      title: "Laboratoire de génération d'images",
      description:
        'Générez, modifiez, enregistrez et réutilisez des images par le flux géré par la passerelle.',
    },
    video: {
      title: 'Laboratoire de génération vidéo',
      description:
        'Créez, suivez, ingérez, prévisualisez et téléchargez des tâches vidéo gérées par la passerelle.',
    },
  },
} as const;
