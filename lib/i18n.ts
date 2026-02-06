export type Locale = "de" | "ar"

export const locales: { code: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
]

export const translations = {
  de: {
    // Navigation
    nav: {
      home: "Startseite",
      about: "Über uns",
      gallery: "Galerie",
      contact: "Kontakt",
    },

    // Header
    header: {
      title: "Syrische Gemeinschaft",
      subtitle: "im Saarland",
    },

    // Hero
    hero: {
      title: "Syrische Gemeinschaft im Saarland",
      titleAr: "تجمع السوريين في زارلاند",
      subtitle: "Herzlich willkommen! Wir verbinden Kulturen und schaffen Gemeinschaft.",
      cta: "Mehr erfahren",
      ctaContact: "Kontakt aufnehmen",
    },

    // Welcome
    welcome: {
      title: "Willkommen in unserer Gemeinschaft",
      text: "Herzlich willkommen bei der Syrischen Gemeinschaft im Saarland! Wir sind eine Gemeinschaft, die syrische Familien und Einzelpersonen im Saarland zusammenbringt.",
    },

    // Features
    features: {
      title: "Was wir bieten",
      community: {
        title: "Gemeinschaft",
        text: "Wir bringen Menschen zusammen und fördern den kulturellen Austausch zwischen Syrern und Deutschen.",
      },
      support: {
        title: "Unterstützung",
        text: "Wir bieten Hilfe und Beratung für Neuankömmlinge und unterstützen bei der Integration.",
      },
      homeland: {
        title: "Heimat Saarland",
        text: "Gemeinsam entdecken wir die Schönheit des Saarlandes und machen es zu unserer neuen Heimat.",
      },
    },

    // Gallery
    gallery: {
      title: "Das Saarland entdecken",
      subtitle: "Erkunden Sie die wunderschönen Sehenswürdigkeiten unserer Region",
      fullGallery: "Zur vollständigen Galerie",
      pageTitle: "Galerie",
      pageSubtitle: "Entdecken Sie die wunderschönen Sehenswürdigkeiten des Saarlandes",
      saarlandTitle: "Das Saarland - Unsere Heimat",
      saarlandText: "Das Saarland bietet eine einzigartige Mischung aus Natur, Kultur und Geschichte. Von der berühmten Saarschleife über die UNESCO-Weltkulturerbe Völklinger Hütte bis hin zur barocken Ludwigskirche - hier gibt es viel zu entdecken.",
      close: "Schließen",
    },

    // CTA
    cta: {
      title: "Werden Sie Teil unserer Gemeinschaft",
      text: "Treten Sie mit uns in Kontakt und werden Sie Teil einer lebendigen Gemeinschaft.",
      button: "Jetzt Kontakt aufnehmen",
    },

    // About
    about: {
      pageTitle: "Über uns",
      whoWeAre: "Wer wir sind",
      whoWeAreText: "Die Syrische Gemeinschaft im Saarland ist ein Verein, der syrische Familien und Einzelpersonen im Saarland zusammenbringt. Wir setzen uns für die Integration, den kulturellen Austausch und die gegenseitige Unterstützung ein.",
      community: "Gemeinschaft",
      communityText: "Wir schaffen einen Ort der Begegnung und des Austauschs für alle.",
      integration: "Integration",
      integrationText: "Wir fördern die Integration und helfen bei der Eingewöhnung in Deutschland.",
      cooperation: "Zusammenarbeit",
      cooperationText: "Wir arbeiten mit lokalen Organisationen und Behörden zusammen.",
      history: "Unsere Geschichte",
      historyText1: "Unsere Gemeinschaft wurde gegründet, um syrischen Familien im Saarland eine Anlaufstelle zu bieten. Wir organisieren regelmäßig Veranstaltungen, bieten Beratung und fördern den kulturellen Austausch zwischen der syrischen und deutschen Gemeinschaft.",
      historyText2: "Das Saarland ist unsere neue Heimat geworden, und wir möchten dazu beitragen, dass sich alle hier willkommen fühlen.",
      team: "Unser Team",
      teamText: "Unser engagiertes Team arbeitet ehrenamtlich für die Gemeinschaft.",
      teamSoon: "Informationen über unser Team werden in Kürze hinzugefügt.",
    },

    // Contact
    contact: {
      pageTitle: "Kontakt",
      pageSubtitle: "Wir freuen uns von Ihnen zu hören",
      getInTouch: "Nehmen Sie Kontakt auf",
      getInTouchText: "Haben Sie Fragen oder möchten Sie mehr über unsere Gemeinschaft erfahren? Wir sind gerne für Sie da.",
      email: "E-Mail",
      phone: "Telefon",
      phoneValue: "Auf Anfrage",
      location: "Standort",
      locationValue: "Saarland, Deutschland",
      followUs: "Folgen Sie uns",
      writeUs: "Schreiben Sie uns",
      firstName: "Vorname",
      lastName: "Nachname",
      emailLabel: "E-Mail",
      subject: "Betreff",
      subjectPlaceholder: "Worum geht es?",
      message: "Nachricht",
      messagePlaceholder: "Ihre Nachricht...",
      send: "Nachricht senden",
      sending: "Wird gesendet...",
      sent: "Nachricht gesendet!",
      sentText: "Vielen Dank für Ihre Nachricht. Wir werden uns bald bei Ihnen melden.",
      newMessage: "Neue Nachricht senden",
    },

    // Footer
    footer: {
      title: "Syrische Gemeinschaft im Saarland",
      description: "Eine Gemeinschaft, die syrische Familien und Einzelpersonen im Saarland zusammenbringt.",
      navigation: "Navigation",
      followUs: "Folgen Sie uns",
      rights: "Alle Rechte vorbehalten.",
    },

    // Admin
    admin: {
      title: "Bildverwaltung",
      subtitle: "Verwalten Sie die Bilder Ihrer Webseite",
    },

    // Gallery image titles
    images: {
      saarschleife: "Saarschleife",
      ludwigskirche: "Ludwigskirche",
      saarbrueckerSchloss: "Saarbrücker Schloss",
      voelklingerHuette: "Völklinger Hütte",
      saarPolygon: "Saar Polygon",
      bostalsee: "Bostalsee",
    },
  },

  ar: {
    // Navigation
    nav: {
      home: "الصفحة الرئيسية",
      about: "من نحن",
      gallery: "معرض الصور",
      contact: "اتصل بنا",
    },

    // Header
    header: {
      title: "تجمع السوريين",
      subtitle: "في زارلاند",
    },

    // Hero
    hero: {
      title: "تجمع السوريين في زارلاند",
      titleAr: "تجمع السوريين في زارلاند",
      subtitle: "أهلاً وسهلاً! نحن نربط بين الثقافات ونبني مجتمعاً متماسكاً.",
      cta: "اعرف المزيد",
      ctaContact: "تواصل معنا",
    },

    // Welcome
    welcome: {
      title: "مرحباً بكم في مجتمعنا",
      text: "مرحباً بكم في تجمع السوريين في زارلاند! نحن مجتمع يجمع العائلات والأفراد السوريين في ولاية زارلاند.",
    },

    // Features
    features: {
      title: "ما نقدمه",
      community: {
        title: "المجتمع",
        text: "نجمع الناس معاً ونعزز التبادل الثقافي بين السوريين والألمان.",
      },
      support: {
        title: "الدعم",
        text: "نقدم المساعدة والاستشارة للقادمين الجدد وندعم عملية الاندماج.",
      },
      homeland: {
        title: "وطننا زارلاند",
        text: "معاً نكتشف جمال زارلاند ونجعلها وطننا الجديد.",
      },
    },

    // Gallery
    gallery: {
      title: "اكتشف زارلاند",
      subtitle: "استكشف المعالم السياحية الرائعة في منطقتنا",
      fullGallery: "المعرض الكامل",
      pageTitle: "معرض الصور",
      pageSubtitle: "اكتشف المعالم السياحية الرائعة في زارلاند",
      saarlandTitle: "زارلاند - وطننا",
      saarlandText: "تقدم زارلاند مزيجاً فريداً من الطبيعة والثقافة والتاريخ. من منحنى نهر السار الشهير إلى مصنع فولكلينغن للحديد المدرج في قائمة التراث العالمي لليونسكو وصولاً إلى كنيسة لودفيغ الباروكية - هناك الكثير لاكتشافه.",
      close: "إغلاق",
    },

    // CTA
    cta: {
      title: "كن جزءاً من مجتمعنا",
      text: "تواصل معنا وكن جزءاً من مجتمع حيوي ونشط.",
      button: "تواصل معنا الآن",
    },

    // About
    about: {
      pageTitle: "من نحن",
      whoWeAre: "من نحن",
      whoWeAreText: "تجمع السوريين في زارلاند هو جمعية تجمع العائلات والأفراد السوريين في ولاية زارلاند. نحن نعمل من أجل الاندماج والتبادل الثقافي والدعم المتبادل.",
      community: "المجتمع",
      communityText: "نخلق مكاناً للتلاقي والتبادل للجميع.",
      integration: "الاندماج",
      integrationText: "نعزز الاندماج ونساعد في التأقلم في ألمانيا.",
      cooperation: "التعاون",
      cooperationText: "نتعاون مع المنظمات والجهات المحلية.",
      history: "قصتنا",
      historyText1: "تأسس مجتمعنا لتوفير مركز اتصال للعائلات السورية في زارلاند. ننظم فعاليات بانتظام ونقدم الاستشارات ونعزز التبادل الثقافي بين المجتمعين السوري والألماني.",
      historyText2: "أصبحت زارلاند وطننا الجديد، ونريد أن نساهم في أن يشعر الجميع بالترحيب هنا.",
      team: "فريقنا",
      teamText: "يعمل فريقنا المتفاني تطوعياً من أجل المجتمع.",
      teamSoon: "سيتم إضافة معلومات عن فريقنا قريباً.",
    },

    // Contact
    contact: {
      pageTitle: "اتصل بنا",
      pageSubtitle: "يسعدنا سماع رأيكم",
      getInTouch: "تواصل معنا",
      getInTouchText: "هل لديك أسئلة أو تريد معرفة المزيد عن مجتمعنا؟ نحن هنا من أجلك.",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      phoneValue: "عند الطلب",
      location: "الموقع",
      locationValue: "زارلاند، ألمانيا",
      followUs: "تابعنا",
      writeUs: "اكتب لنا",
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      emailLabel: "البريد الإلكتروني",
      subject: "الموضوع",
      subjectPlaceholder: "ما هو الموضوع؟",
      message: "الرسالة",
      messagePlaceholder: "رسالتك...",
      send: "إرسال الرسالة",
      sending: "جاري الإرسال...",
      sent: "تم إرسال الرسالة!",
      sentText: "شكراً لرسالتك. سنتواصل معك قريباً.",
      newMessage: "إرسال رسالة جديدة",
    },

    // Footer
    footer: {
      title: "تجمع السوريين في زارلاند",
      description: "مجتمع يجمع العائلات والأفراد السوريين في ولاية زارلاند.",
      navigation: "التنقل",
      followUs: "تابعنا",
      rights: "جميع الحقوق محفوظة.",
    },

    // Admin
    admin: {
      title: "إدارة الصور",
      subtitle: "إدارة صور موقعك الإلكتروني",
    },

    // Gallery image titles
    images: {
      saarschleife: "منحنى نهر السار",
      ludwigskirche: "كنيسة لودفيغ",
      saarbrueckerSchloss: "قصر زاربروكن",
      voelklingerHuette: "مصنع فولكلينغن",
      saarPolygon: "مضلع السار",
      bostalsee: "بحيرة بوستال",
    },
  },
} as const

export type Translations = typeof translations.de
