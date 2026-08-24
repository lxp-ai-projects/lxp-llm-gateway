export const es = {
  common: {
    actions: {
      cancel: 'Cancelar',
      close: 'Cerrar',
      confirm: 'Confirmar',
      delete: 'Eliminar',
      install: 'Instalar aplicación',
      logout: 'Cerrar sesión',
      save: 'Guardar',
      submit: 'Enviar',
    },
    activeTenant: 'Tenant activo: {{tenant}}',
    controlPlane: 'Plano de control',
    language: { label: 'Idioma', select: 'Seleccionar idioma' },
    loading: 'Cargando...',
    status: {
      active: 'Activo',
      disabled: 'Desactivado',
      live: 'En directo',
      unavailable: 'No disponible',
    },
  },
  auth: {
    brand: {
      badge: 'Gateway LXP',
      title: 'Un camino más claro desde la intención hasta la inteligencia.',
      description:
        'Un espacio de trabajo centrado en gestionar el acceso a modelos, las credenciales y los sistemas de los que depende tu equipo.',
      secureAccess: 'Acceso seguro al espacio de trabajo',
    },
    login: {
      kicker: 'Inicio de sesión seguro',
      title: 'Te damos la bienvenida de nuevo',
      description: 'Inicia sesión para continuar a tu espacio de trabajo LXP.',
      failed: 'Error de inicio de sesión',
      genericFailure: 'No se pudo autenticar con las credenciales actuales.',
      email: 'Correo electrónico',
      emailPlaceholder: 'correo@dominio.com',
      password: 'Contraseña',
      passwordPlaceholder: 'Tu contraseña',
      acceptPrefix: 'Acepto los',
      terms: 'términos',
      conjunction: 'y la',
      privacy: 'política de privacidad',
      submit: 'Iniciar sesión',
      createAccount: 'Crear cuenta',
      registrationDisabled: 'Registro desactivado',
      forgotPassword: 'Olvidé mi contraseña',
      recoveryDisabled: 'Recuperación desactivada',
    },
    session: {
      expired: 'Sesión caducada',
      restoring: 'Restaurando la sesión segura...',
      unavailable: 'Perfil de sesión no disponible',
    },
    denied: {
      title: 'Superficie restringida',
      alertTitle: 'Se requiere acceso de administrador',
      description: 'Tu rol actual no permite acceder a esta sección.',
    },
    roles: {
      superAdmin: 'Superadministrador',
      tenantAdmin: 'Administrador del tenant',
      user: 'Usuario',
    },
  },
  navigation: {
    overview: 'Resumen',
    providerTokens: 'Tokens de proveedor',
    profile: 'Perfil',
    chatLab: 'Laboratorio de chat',
    imageLab: 'Laboratorio de imágenes',
    videoLab: 'Laboratorio de vídeo',
    evaluationLab: 'Laboratorio de evaluación',
    users: 'Usuarios',
    tenants: 'Tenants',
    analytics: 'Analítica',
    health: 'Estado',
    groups: {
      workspace: 'Espacio de trabajo',
      tenantAdmin: 'Administración del tenant',
      global: 'Plano de control global',
    },
    enterpriseControlPlane: 'Plano de control empresarial',
    workspaceFallback: 'Espacio de trabajo',
    gatewayOnline: 'Gateway en línea',
    gatewayOffline: 'Gateway sin conexión',
    securityTitle: 'Postura de seguridad',
    securityDescription:
      'Autenticación mediante cookies del navegador, secretos de proveedores cifrados y navegación según roles.',
  },
  errors: {
    generic: 'Algo salió mal. Inténtalo de nuevo.',
    authenticationRequired: 'Se requiere autenticación. Inicia sesión.',
    permissionDenied: 'No tienes permiso para realizar esta acción.',
    networkUnavailable:
      'El servicio no está disponible. Comprueba tu conexión e inténtalo de nuevo.',
    serverFailure:
      'El servidor no pudo completar la solicitud. Inténtalo de nuevo.',
    sessionExpired: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
    credentialConflict: 'Ya existe una credencial para este proveedor.',
    validation: 'Revisa los valores indicados e inténtalo de nuevo.',
    route: {
      title: 'Error de la aplicación',
      description:
        'La página no pudo terminar de cargarse. Suele ocurrir cuando los servidores de desarrollo locales están detenidos o usan puertos inesperados.',
      details: 'Detalles',
      unexpected: 'Se produjo un error inesperado en la aplicación.',
      ports:
        'Comprueba que gateway-api esté en el puerto 3001, admin-api en el 3002 y admin-web en el 3003; después recarga la página.',
      return: 'Volver al inicio de la aplicación',
    },
  },
  pages: {
    dashboard: {
      title: 'Resumen',
      description:
        'Una SPA, navegación según roles y una separación clara entre autoservicio y controles administrativos.',
      session: 'Sesión',
      authenticated: 'Autenticada',
      unavailable: 'No disponible',
      authPosture: 'Modelo de autenticación',
      cookieOnly: 'Solo cookies',
      gateway: 'Gateway',
      online: 'En línea',
      offline: 'Sin conexión',
      roleSurface: 'Alcance del rol',
      superAdminSurface: 'Superadministrador + tenant + usuario',
      tenantAdminSurface: 'Administrador del tenant + usuario',
      userSurface: 'Solo usuario',
      registration: 'Registro',
      enabled: 'Activado',
      disabled: 'Desactivado',
      breakerTitle: 'El disyuntor del gateway está activo',
      breakerDescription:
        'El tráfico de chat recibirá una respuesta de servicio sin conexión hasta que un administrador reactive el gateway.',
    },
    health: {
      title: 'Estado',
      description:
        'Vista del estado operativo de los dos planos iniciales de la plataforma.',
      checking: 'Comprobando...',
      unavailable: 'No disponible',
      unknown: 'Desconocido',
    },
    legal: {
      back: 'Volver al inicio de sesión',
      termsKicker: 'Términos',
      termsTitle: 'Términos del servicio',
      termsDescription:
        'Esta página provisional ofrece la navegación legal correcta mientras se finaliza el texto formal.',
      termsCredential:
        'El uso de credenciales de proveedores está sujeto a la política de la plataforma.',
      termsAdmin:
        'Las acciones administrativas dependen de roles y son auditables.',
      termsGateway:
        'El acceso al gateway puede interrumpirse mediante un disyuntor global.',
      privacyKicker: 'Privacidad',
      privacyTitle: 'Postura de privacidad',
      privacyDescription:
        'Esta página refleja la seguridad inicial del backend: credenciales cifradas, correlación de identidad con hash y autenticación solo por cookies.',
      privacySecrets:
        'Los secretos API de los proveedores se cifran en reposo.',
      privacySessions:
        'Las sesiones del navegador evitan exponer tokens a JavaScript.',
      privacyIdentity:
        'La resolución de identidad del tráfico del gateway utiliza emailHash.',
    },
    pending: {
      registrationKicker: 'Registro',
      registrationTitle: 'Crear cuenta',
      recoveryKicker: 'Recuperación de cuenta',
      recoveryTitle: 'Olvidé mi contraseña',
      recoveryDescription:
        'Esta ruta está controlada por la configuración de ejecución del backend.',
      backendFlow: 'Flujo backend pendiente',
      backendEndpoint: 'Endpoint backend pendiente',
      registrationPending:
        'El autorregistro está activado, pero el flujo backend aún debe implementarse.',
      recoveryPending:
        'La interfaz está lista, pero el flujo backend de recuperación aún no está implementado.',
      disabledTitle: 'Desactivado por configuración',
      registrationDisabled:
        'El registro está desactivado para este despliegue.',
      recoveryDisabled:
        'La recuperación de contraseña está desactivada para este despliegue.',
    },
    providers: {
      title: 'Credenciales de proveedores',
      description:
        'Gestiona tus credenciales de solo escritura y elige pares de proveedor/modelo distintos para chat e imágenes.',
      boundaryTitle: 'Recordatorio de límites',
      boundaryDescription:
        'Los administradores pueden crear o restablecer credenciales de otro usuario, pero solo deben ver la versión enmascarada, nunca el token sin procesar.',
    },
    users: {
      title: 'Gestión de usuarios',
      description:
        'Controles administrativos de búsqueda, ciclo de vida, roles y restablecimiento de contraseñas.',
      create: 'Crear usuario',
      dependencyTitle: 'Dependencia del backend',
      dependencyDescription:
        'La lista y el ciclo de vida básico ya están conectados. La reasignación de roles, paginación, transferencia de administrador y contraseñas aún requieren soporte backend.',
    },
    image: {
      title: 'Laboratorio de generación de imágenes',
      description:
        'Genera, edita, guarda y reutiliza imágenes mediante el flujo gestionado por el gateway.',
    },
    video: {
      title: 'Laboratorio de generación de vídeo',
      description:
        'Crea, consulta, ingiere, previsualiza y descarga trabajos de vídeo gestionados por el gateway.',
    },
  },
} as const;
