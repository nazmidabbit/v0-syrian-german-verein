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
      events: "Veranstaltungen",
      news: "Nachrichten",
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

    // Events
    events: {
      title: "Aktuelle Veranstaltungen",
      subtitle: "Entdecken Sie unsere kommenden und vergangenen Events",
      pageTitle: "Veranstaltungen",
      pageSubtitle: "Alle Events unserer Gemeinschaft",
      allEvents: "Alle Veranstaltungen",
      noEvents: "Derzeit sind keine Veranstaltungen geplant.",
      loading: "Veranstaltungen werden geladen...",
    },

    // News
    news: {
      pageTitle: "Nachrichten",
      pageSubtitle: "Aktuelle Neuigkeiten aus unserer Gemeinschaft",
      noNews: "Derzeit gibt es keine Nachrichten.",
      loading: "Nachrichten werden geladen...",
      readMore: "Weiterlesen",
      publishedOn: "Veröffentlicht am",
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
      locationValue: "Breite Straße 28, 66115 Saarbrücken",
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
      legal: "Rechtliches",
      impressum: "Impressum",
      datenschutz: "Datenschutzerklärung",
      followUs: "Folgen Sie uns",
      rights: "Alle Rechte vorbehalten.",
    },

    // Cookie Consent
    cookieConsent: {
      text: "Wir verwenden technisch notwendige Cookies, um den Betrieb unserer Website zu gewährleisten. Weitere Informationen finden Sie in unserer",
      link: "Datenschutzerklärung",
      accept: "Akzeptieren",
      decline: "Ablehnen",
    },

    // Admin
    admin: {
      title: "Bildverwaltung",
      subtitle: "Verwalten Sie die Bilder Ihrer Webseite",
    },

    // Impressum
    impressum: {
      pageTitle: "Impressum",
      inGruendung: "Verein in Gründung (i. Gr.)",
      angaben: "Angaben gemäß § 5 TMG",
      name: "Syrische Gemeinschaft im Saarland e.V. (i. Gr.)",
      alwadi: "Alwadi",
      address: "Breite Straße 28, 66115 Saarbrücken",
      contact: "Kontakt",
      email: "E-Mail: info@sygs.de",
      responsible: "Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV",
      responsibleNote: "Die verantwortliche Person wird nach Abschluss der Vereinsgründung hier benannt.",
      disclaimer: "Haftungsausschluss",
      disclaimerContent: "Haftung für Inhalte",
      disclaimerText: "Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.",
      linksTitle: "Haftung für Links",
      linksText: "Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.",
      copyrightTitle: "Urheberrecht",
      copyrightText: "Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.",
      gruendungshinweis: "Hinweis: Die Syrische Gemeinschaft im Saarland befindet sich derzeit in der Gründungsphase. Die Angaben auf dieser Seite werden nach Abschluss der Vereinsregistrierung aktualisiert.",
    },

    // Datenschutz
    datenschutz: {
      pageTitle: "Datenschutzerklärung",
      intro: "Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.",
      responsibleTitle: "1. Verantwortliche Stelle",
      responsibleText: "Verantwortlich für die Datenverarbeitung auf dieser Website ist:",
      responsibleName: "Syrische Gemeinschaft im Saarland e.V. (i. Gr.)",
      responsibleEmail: "E-Mail: info@sygs.de",
      dataCollectionTitle: "2. Erhebung und Speicherung personenbezogener Daten",
      dataCollectionText: "Beim Besuch unserer Website werden automatisch Informationen allgemeiner Natur erfasst (Server-Logfiles). Diese Informationen beinhalten u.a. die Art des Webbrowsers, das verwendete Betriebssystem, den Domainnamen Ihres Internet-Service-Providers und Ähnliches. Hierbei handelt es sich ausschließlich um Informationen, welche keine Rückschlüsse auf Ihre Person zulassen.",
      contactFormTitle: "3. Kontaktformular",
      contactFormText: "Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.",
      cookiesTitle: "4. Cookies",
      cookiesText: "Unsere Website verwendet Cookies. Dabei handelt es sich um kleine Textdateien, die auf Ihrem Endgerät gespeichert werden. Wir verwenden ausschließlich technisch notwendige Cookies, die für den Betrieb der Website erforderlich sind (z.B. Authentifizierungs-Cookies für den Login-Bereich).",
      rightsTitle: "5. Ihre Rechte",
      rightsText: "Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit an uns wenden.",
      hostingTitle: "6. Hosting",
      hostingText: "Diese Website wird bei Vercel Inc. gehostet. Die Server befinden sich in verschiedenen Rechenzentren weltweit. Weitere Informationen finden Sie in der Datenschutzerklärung von Vercel.",
      supabaseTitle: "7. Datenbank",
      supabaseText: "Wir nutzen Supabase als Datenbankdienst zur Speicherung von Inhalten und Benutzerdaten. Die Daten werden auf Servern in der EU gespeichert.",
      changesTitle: "8. Änderungen",
      changesText: "Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen umzusetzen.",
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
      events: "الفعاليات",
      news: "الأخبار",
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

    // Events
    events: {
      title: "الفعاليات الحالية",
      subtitle: "اكتشف فعالياتنا القادمة والسابقة",
      pageTitle: "الفعاليات",
      pageSubtitle: "جميع فعاليات مجتمعنا",
      allEvents: "جميع الفعاليات",
      noEvents: "لا توجد فعاليات مخططة حالياً.",
      loading: "جاري تحميل الفعاليات...",
    },

    // News
    news: {
      pageTitle: "الأخبار",
      pageSubtitle: "آخر الأخبار من مجتمعنا",
      noNews: "لا توجد أخبار حالياً.",
      loading: "جاري تحميل الأخبار...",
      readMore: "اقرأ المزيد",
      publishedOn: "نُشر في",
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
      locationValue: "Breite Straße 28, 66115 Saarbrücken",
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
      legal: "قانوني",
      impressum: "البيانات القانونية",
      datenschutz: "سياسة الخصوصية",
      followUs: "تابعنا",
      rights: "جميع الحقوق محفوظة.",
    },

    // Cookie Consent
    cookieConsent: {
      text: "نستخدم ملفات تعريف الارتباط الضرورية تقنياً لضمان تشغيل موقعنا. لمزيد من المعلومات، يرجى الاطلاع على",
      link: "سياسة الخصوصية",
      accept: "قبول",
      decline: "رفض",
    },

    // Admin
    admin: {
      title: "إدارة الصور",
      subtitle: "إدارة صور موقعك الإلكتروني",
    },

    // Impressum
    impressum: {
      pageTitle: "البيانات القانونية",
      inGruendung: "جمعية قيد التأسيس",
      angaben: "المعلومات وفقاً للمادة 5 من قانون الاتصالات",
      name: "تجمع السوريين في زارلاند (قيد التأسيس)",
      alwadi: "الوادي",
      address: "Breite Straße 28, 66115 Saarbrücken",
      contact: "التواصل",
      email: "البريد الإلكتروني: info@sygs.de",
      responsible: "المسؤول عن المحتوى",
      responsibleNote: "سيتم تسمية الشخص المسؤول بعد الانتهاء من تأسيس الجمعية.",
      disclaimer: "إخلاء المسؤولية",
      disclaimerContent: "المسؤولية عن المحتوى",
      disclaimerText: "تم إنشاء محتويات صفحاتنا بأقصى قدر من العناية. ومع ذلك، لا يمكننا ضمان صحة واكتمال وحداثة المحتوى.",
      linksTitle: "المسؤولية عن الروابط",
      linksText: "يحتوي عرضنا على روابط لمواقع خارجية لأطراف ثالثة لا نملك أي تأثير على محتواها. لذلك لا يمكننا تحمل أي مسؤولية عن هذا المحتوى الخارجي.",
      copyrightTitle: "حقوق النشر",
      copyrightText: "المحتويات والأعمال المنشأة من قبل مشغلي الموقع تخضع لقانون حقوق النشر الألماني.",
      gruendungshinweis: "ملاحظة: تجمع السوريين في زارلاند في مرحلة التأسيس حالياً. سيتم تحديث المعلومات بعد الانتهاء من تسجيل الجمعية.",
    },

    // Datenschutz
    datenschutz: {
      pageTitle: "سياسة الخصوصية",
      intro: "نأخذ حماية بياناتك الشخصية على محمل الجد. نتعامل مع بياناتك الشخصية بسرية ووفقاً للوائح حماية البيانات القانونية وسياسة الخصوصية هذه.",
      responsibleTitle: "1. الجهة المسؤولة",
      responsibleText: "المسؤول عن معالجة البيانات على هذا الموقع هو:",
      responsibleName: "تجمع السوريين في زارلاند (قيد التأسيس)",
      responsibleEmail: "البريد الإلكتروني: info@sygs.de",
      dataCollectionTitle: "2. جمع وتخزين البيانات الشخصية",
      dataCollectionText: "عند زيارة موقعنا، يتم تسجيل معلومات عامة تلقائياً. هذه المعلومات لا تسمح بالتعرف على شخصيتك.",
      contactFormTitle: "3. نموذج الاتصال",
      contactFormText: "عند إرسال استفسارات عبر نموذج الاتصال، يتم تخزين بياناتك لمعالجة الطلب. لن نشارك هذه البيانات دون موافقتك.",
      cookiesTitle: "4. ملفات تعريف الارتباط",
      cookiesText: "يستخدم موقعنا ملفات تعريف الارتباط الضرورية تقنياً فقط والمطلوبة لتشغيل الموقع.",
      rightsTitle: "5. حقوقك",
      rightsText: "لديك الحق في الحصول على معلومات مجانية حول بياناتك الشخصية المخزنة وحق التصحيح أو الحذف في أي وقت.",
      hostingTitle: "6. الاستضافة",
      hostingText: "يتم استضافة هذا الموقع لدى شركة Vercel Inc.",
      supabaseTitle: "7. قاعدة البيانات",
      supabaseText: "نستخدم Supabase كخدمة قاعدة بيانات. يتم تخزين البيانات على خوادم في الاتحاد الأوروبي.",
      changesTitle: "8. التغييرات",
      changesText: "نحتفظ بالحق في تعديل سياسة الخصوصية هذه لتتوافق دائماً مع المتطلبات القانونية الحالية.",
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
