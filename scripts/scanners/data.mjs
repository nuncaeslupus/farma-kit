// Barcode-scanner configurations tested with Farmatic on Windows. Single source
// of truth for the /lectores/ pages and their printable PDFs — edit here, then
// `npm run gen:scanners` (see scripts/gen-scanners.mjs).
//
// `data` is the EXACT payload of each configuration code, decoded from the
// codes that were scanned on the real devices. Do not retype them by eye: a
// wrong character turns a settings code into a no-op (or worse). `\x80` is a
// raw byte (Latin-1), encoded as such in the QR.

export const LANGS = ['es', 'ca', 'eu', 'gl'];

export const SCANNERS = [
  {
    slug: 'honeywell-voyager-1472g',
    brand: 'Honeywell',
    model: 'Voyager 1472g',
    partNo: '1472G2D-2-R-INT',
    img: 'honeywell-voyager-1472g.webp',
    // Honeywell menu codes are plain Code 128 with the command as text.
    steps: [
      { bcid: 'code128', data: 'DEFALT.', key: 'factory' },
      { bcid: 'code128', data: 'KBDCTY10.', key: 'kbdEs' },
      { bcid: 'code128', data: 'PAPTPR.', key: 'presentation' },
      { bcid: 'code128', data: 'VSUFCR.', key: 'enter' },
      { bcid: 'code128', data: 'KBDCAS3.', key: 'gsHoneywell' },
    ],
    options: [
      { bcid: 'code128', data: 'KBDCAS2.', key: 'gsHoneywellAlt' },
      { bcid: 'code128', data: 'KBDCAS0.', key: 'gsHoneywellUndo' },
      { bcid: 'code128', data: 'PAPHHF.', key: 'trigger' },
    ],
    links: [
      {
        key: 'quickStart',
        href: 'https://prod-edam.honeywell.com/content/dam/honeywell-edam/sps/ppr/ja/public/products/barcode-scanners/general-purpose-handheld/1472g/documents/sps-ppr-vg1472-en-qs.pdf',
      },
      { key: 'userGuide', href: 'https://www.posnet.com.pl/files/products_download/385/vg147x-ug1.pdf' },
      {
        key: 'ctrlX',
        href: 'https://sps-support.honeywell.com/s/article/How-to-enable-Control-X-translations-for-characters-encoded-in-bar-code-only',
      },
    ],
  },
  {
    slug: 'tera-d5100',
    brand: 'Tera',
    model: 'D5100',
    partNo: 'D5100',
    img: 'tera-d5100.webp',
    steps: [
      { bcid: 'code128', data: '%%SpecCode93', key: 'factory' },
      { bcid: 'code128', data: '%%SpecCode43', key: 'kbdEs' },
      { bcid: 'code128', data: '%%SpecCode9C', key: 'enter' },
      { bcid: 'qrcode', data: '\x80WSM02000003.', key: 'presentation' },
      // Not in the manual: sent by Tera support (14/10/2026). Makes GS1
      // DataMatrix output FNC1 as GS instead of "(01)…(21)…" parentheses.
      { bcid: 'qrcode', data: '@WSM07063100;07152100;', key: 'gsTera' },
    ],
    // From the D5100 manual (codes decoded from it, not retyped).
    options: [
      { bcid: 'code128', data: '%%SpecCode95', key: 'lowBeep' },
      { bcid: 'code128', data: '%%SpecCode97', key: 'volumeNormal' },
      { bcid: 'qrcode', data: '\x80WSM02000000.', key: 'trigger' },
    ],
    // Tera's official manuals page lists these PDFs (on its Shopify CDN) under D5100.
    links: [
      {
        key: 'teraManualEs',
        href: 'https://cdn.shopify.com/s/files/1/0144/3482/8374/files/TR-UM017-ES-ZQ-Ver.02.1.05-2022.9.1-S02.pdf?v=1679586443',
      },
      {
        key: 'teraManualEn',
        href: 'https://cdn.shopify.com/s/files/1/0144/3482/8374/files/TR-UM017-EN-ZQ-Ver.02.1.05-2022.9.16-S02.pdf?v=1679586443',
      },
      { key: 'teraManuals', href: 'https://tera-digital.com/es/pages/user-manual' },
    ],
  },
];

/** Per-language copy. Step texts are keyed by `key` above. */
export const T = {
  es: {
    navCoupons: 'Hojas de cupones',
    navScanners: 'Lectores de códigos',
    indexTitle: 'Configurar lectores de códigos de barras para Farmatic',
    indexShort: 'Lectores de códigos de barras',
    indexDesc:
      'Códigos de configuración probados para que tu lector de códigos de barras funcione con Farmatic en Windows: teclado español, Intro al final y separador GS para los DataMatrix de los medicamentos.',
    indexIntro:
      'Configuraciones probadas en farmacias reales con <strong>Farmatic</strong> y <strong>Windows</strong>. Elige tu lector y escanea sus códigos en orden, desde la pantalla o impresos.',
    tested: 'Probado con Farmatic · Windows',
    seeConfig: 'Ver la configuración',
    howToKnow: '¿Es el tuyo?',
    identifyLabel: 'Mira la etiqueta del lector:',
    pageTitle: (s) => `Configurar el lector ${s.brand} ${s.model} para Farmatic`,
    pageDesc: (s) =>
      `Códigos de configuración, en orden, para que el lector ${s.brand} ${s.model} funcione con Farmatic en Windows. Para escanear desde la pantalla o imprimir en PDF.`,
    howTo:
      'Con el lector encendido, escanea los códigos de arriba abajo, uno a uno. Después de cada código debe sonar un pitido.',
    screenTip: 'Si no lee desde la pantalla, sube el brillo o imprime el PDF.',
    steps: 'Configuración',
    optionsTitle: 'Opciones (solo si hace falta)',
    check: 'Comprobar',
    checkText:
      'Abre Farmatic y lee un medicamento con código cuadrado (DataMatrix). Debe reconocer el lote, la caducidad y el número de serie sin dar ningún error.',
    pdf: 'Descargar PDF para imprimir',
    links: 'Documentación del fabricante',
    back: '← Todos los lectores',
    payload: 'Contenido',
    faqTitle: 'Preguntas frecuentes',
    faq: [
      [
        '¿Puedo escanear los códigos directamente desde la pantalla?',
        'Normalmente sí. Si el lector no reacciona, sube el brillo de la pantalla, aleja un poco el lector o imprime el PDF.',
      ],
      [
        '¿Por qué hace falta el separador GS?',
        'El código DataMatrix de los medicamentos lleva juntos el código nacional, el lote, la caducidad y el número de serie. Farmatic necesita un carácter invisible (GS) entre ellos para separarlos. Con la configuración de fábrica muchos lectores no lo envían, y Farmatic da error o mezcla los datos.',
      ],
      [
        '¿Cómo vuelvo atrás si algo sale mal?',
        'Escanea el primer código (configuración de fábrica) y vuelve a empezar desde el principio.',
      ],
      [
        'Mi lector no aparece. ¿Podéis añadirlo?',
        'Escríbenos desde «Contactar» con la marca y el modelo (está en la etiqueta del lector). Si tenemos el manual, podemos preparar y probar su configuración.',
      ],
    ],
    linkLabels: {
      quickStart: 'Guía rápida (Honeywell, PDF, inglés)',
      userGuide: 'Manual de usuario completo (PDF, inglés)',
      ctrlX: 'Artículo de Honeywell sobre el modo Ctrl+X (inglés)',
      teraManualEs: 'Manual de usuario de Tera (PDF, español)',
      teraManualEn: 'Manual de usuario de Tera (PDF, inglés)',
      teraManuals: 'Todos los manuales en la web de Tera',
    },
    s: {
      factory: ['Volver a la configuración de fábrica', 'Parte siempre de un estado conocido.'],
      kbdEs: ['Teclado en español', 'Para que los símbolos y las letras salgan bien en Windows.'],
      presentation: ['Leer sin apretar el botón', 'El lector lee solo al acercarle un código.'],
      enter: ['Intro al final', 'Cada lectura termina con un Intro, como espera Farmatic.'],
      lowBeep: ['Pitido bajo', 'Menos ruido; útil si avisa a menudo de batería baja.'],
      volumeNormal: ['Volver al volumen normal', 'Deshace el pitido bajo.'],
      gsHoneywell: ['Separador GS para Farmatic', 'Modo Ctrl+X para Windows, conservando prefijo y sufijo.'],
      gsTera: [
        'Separador GS para Farmatic',
        'Código enviado por el soporte de Tera (no aparece en el manual). Los DataMatrix salen sin paréntesis y con el separador GS.',
      ],
      gsHoneywellAlt: ['Paso 5 alternativo', 'Solo si el paso 5 deja de funcionar (Ctrl+X para Windows sin prefijo ni sufijo).'],
      gsHoneywellUndo: ['Deshacer el paso 5', 'Devuelve el separador al valor de fábrica.'],
      trigger: ['Leer apretando el botón', 'Deshace «Leer sin apretar el botón».'],
    },
  },
  ca: {
    navCoupons: 'Fulls de cupons',
    navScanners: 'Lectors de codis',
    indexTitle: 'Configurar lectors de codis de barres per a Farmatic',
    indexShort: 'Lectors de codis de barres',
    indexDesc:
      'Codis de configuració provats perquè el teu lector de codis de barres funcioni amb Farmatic a Windows: teclat espanyol, Intro al final i separador GS per als DataMatrix dels medicaments.',
    indexIntro:
      'Configuracions provades en farmàcies reals amb <strong>Farmatic</strong> i <strong>Windows</strong>. Tria el teu lector i escaneja els seus codis en ordre, des de la pantalla o impresos.',
    tested: 'Provat amb Farmatic · Windows',
    seeConfig: 'Veure la configuració',
    howToKnow: 'És el teu?',
    identifyLabel: "Mira l'etiqueta del lector:",
    pageTitle: (s) => `Configurar el lector ${s.brand} ${s.model} per a Farmatic`,
    pageDesc: (s) =>
      `Codis de configuració, en ordre, perquè el lector ${s.brand} ${s.model} funcioni amb Farmatic a Windows. Per escanejar des de la pantalla o imprimir en PDF.`,
    howTo:
      'Amb el lector encès, escaneja els codis de dalt a baix, un per un. Després de cada codi ha de sonar un xiulet.',
    screenTip: "Si no llegeix des de la pantalla, puja la brillantor o imprimeix el PDF.",
    steps: 'Configuració',
    optionsTitle: 'Opcions (només si cal)',
    check: 'Comprovar',
    checkText:
      'Obre Farmatic i llegeix un medicament amb codi quadrat (DataMatrix). Ha de reconèixer el lot, la caducitat i el número de sèrie sense donar cap error.',
    pdf: 'Descarregar PDF per imprimir',
    links: 'Documentació del fabricant',
    back: '← Tots els lectors',
    payload: 'Contingut',
    faqTitle: 'Preguntes freqüents',
    faq: [
      [
        'Puc escanejar els codis directament des de la pantalla?',
        'Normalment sí. Si el lector no reacciona, puja la brillantor de la pantalla, allunya una mica el lector o imprimeix el PDF.',
      ],
      [
        'Per què cal el separador GS?',
        "El codi DataMatrix dels medicaments porta junts el codi nacional, el lot, la caducitat i el número de sèrie. Farmatic necessita un caràcter invisible (GS) entre ells per separar-los. Amb la configuració de fàbrica molts lectors no l'envien, i Farmatic dona error o barreja les dades.",
      ],
      [
        'Com ho desfaig si alguna cosa va malament?',
        'Escaneja el primer codi (configuració de fàbrica) i torna a començar des del principi.',
      ],
      [
        'El meu lector no hi surt. El podeu afegir?',
        "Escriu-nos des de «Contactar» amb la marca i el model (és a l'etiqueta del lector). Si tenim el manual, en podem preparar i provar la configuració.",
      ],
    ],
    linkLabels: {
      quickStart: 'Guia ràpida (Honeywell, PDF, anglès)',
      userGuide: "Manual d'usuari complet (PDF, anglès)",
      ctrlX: 'Article de Honeywell sobre el mode Ctrl+X (anglès)',
      teraManualEs: "Manual d'usuari de Tera (PDF, castellà)",
      teraManualEn: "Manual d'usuari de Tera (PDF, anglès)",
      teraManuals: 'Tots els manuals al web de Tera',
    },
    s: {
      factory: ['Tornar a la configuració de fàbrica', 'Parteix sempre d’un estat conegut.'],
      kbdEs: ['Teclat en espanyol', 'Perquè els símbols i les lletres surtin bé a Windows.'],
      presentation: ['Llegir sense prémer el botó', 'El lector llegeix sol quan hi acostes un codi.'],
      enter: ['Intro al final', 'Cada lectura acaba amb un Intro, com espera Farmatic.'],
      lowBeep: ['Xiulet baix', 'Menys soroll; útil si avisa sovint de bateria baixa.'],
      volumeNormal: ['Tornar al volum normal', 'Desfà el xiulet baix.'],
      gsHoneywell: ['Separador GS per a Farmatic', 'Mode Ctrl+X per a Windows, conservant prefix i sufix.'],
      gsTera: [
        'Separador GS per a Farmatic',
        'Codi enviat pel suport de Tera (no surt al manual). Els DataMatrix surten sense parèntesis i amb el separador GS.',
      ],
      gsHoneywellAlt: ['Pas 5 alternatiu', 'Només si el pas 5 deixa de funcionar (Ctrl+X per a Windows sense prefix ni sufix).'],
      gsHoneywellUndo: ['Desfer el pas 5', 'Torna el separador al valor de fàbrica.'],
      trigger: ['Llegir prement el botó', 'Desfà «Llegir sense prémer el botó».'],
    },
  },
  eu: {
    navCoupons: 'Kupoi-orriak',
    navScanners: 'Kode-irakurgailuak',
    indexTitle: 'Barra-kode irakurgailuak Farmaticerako konfiguratu',
    indexShort: 'Barra-kode irakurgailuak',
    indexDesc:
      'Probatutako konfigurazio-kodeak, zure barra-kode irakurgailuak Farmaticekin Windowsen funtziona dezan: teklatu espainiarra, Intro amaieran eta GS bereizlea sendagaien DataMatrixetarako.',
    indexIntro:
      'Benetako farmazietan <strong>Farmatic</strong> eta <strong>Windows</strong>ekin probatutako konfigurazioak. Aukeratu zure irakurgailua eta eskaneatu bere kodeak ordenan, pantailatik edo inprimatuta.',
    tested: 'Farmaticekin probatua · Windows',
    seeConfig: 'Ikusi konfigurazioa',
    howToKnow: 'Zurea da?',
    identifyLabel: 'Begiratu irakurgailuaren etiketa:',
    pageTitle: (s) => `${s.brand} ${s.model} irakurgailua Farmaticerako konfiguratu`,
    pageDesc: (s) =>
      `Konfigurazio-kodeak, ordenan, ${s.brand} ${s.model} irakurgailuak Farmaticekin Windowsen funtziona dezan. Pantailatik eskaneatzeko edo PDFan inprimatzeko.`,
    howTo:
      'Irakurgailua piztuta dagoela, eskaneatu kodeak goitik behera, banan-banan. Kode bakoitzaren ondoren txistu-hots bat entzun behar da.',
    screenTip: 'Pantailatik irakurtzen ez badu, igo distira edo inprimatu PDFa.',
    steps: 'Konfigurazioa',
    optionsTitle: 'Aukerak (behar izanez gero bakarrik)',
    check: 'Egiaztatu',
    checkText:
      'Ireki Farmatic eta irakurri kode karratua (DataMatrix) duen sendagai bat. Lotea, iraungitze-data eta serie-zenbakia ezagutu behar ditu, errorerik eman gabe.',
    pdf: 'Deskargatu PDFa inprimatzeko',
    links: 'Fabrikatzailearen dokumentazioa',
    back: '← Irakurgailu guztiak',
    payload: 'Edukia',
    faqTitle: 'Ohiko galderak',
    faq: [
      [
        'Kodeak zuzenean pantailatik eskanea ditzaket?',
        'Normalean bai. Irakurgailuak erantzuten ez badu, igo pantailaren distira, urrundu pixka bat irakurgailua edo inprimatu PDFa.',
      ],
      [
        'Zergatik behar da GS bereizlea?',
        'Sendagaien DataMatrix kodeak kode nazionala, lotea, iraungitze-data eta serie-zenbakia batera dakartza. Farmaticek karaktere ikusezin bat (GS) behar du haien artean, bereizteko. Fabrikako konfigurazioarekin irakurgailu askok ez dute bidaltzen, eta Farmaticek errorea ematen du edo datuak nahasten ditu.',
      ],
      [
        'Nola desegin dezaket zerbait gaizki ateratzen bada?',
        'Eskaneatu lehen kodea (fabrikako konfigurazioa) eta hasi berriro hasieratik.',
      ],
      [
        'Nire irakurgailua ez da agertzen. Gehi dezakezue?',
        'Idatzi iezaguzu «Harremanetarako» atalean, marka eta modeloarekin (irakurgailuaren etiketan dago). Eskuliburua badugu, haren konfigurazioa prestatu eta proba dezakegu.',
      ],
    ],
    linkLabels: {
      quickStart: 'Gida azkarra (Honeywell, PDF, ingelesez)',
      userGuide: 'Erabiltzailearen eskuliburu osoa (PDF, ingelesez)',
      ctrlX: 'Honeywellen artikulua Ctrl+X moduari buruz (ingelesez)',
      teraManualEs: 'Teraren erabiltzailearen eskuliburua (PDF, gaztelaniaz)',
      teraManualEn: 'Teraren erabiltzailearen eskuliburua (PDF, ingelesez)',
      teraManuals: 'Eskuliburu guztiak Teraren webgunean',
    },
    s: {
      factory: ['Fabrikako konfiguraziora itzuli', 'Beti egoera ezagun batetik abiatzeko.'],
      kbdEs: ['Teklatua espainieraz', 'Ikurrak eta letrak Windowsen ondo ager daitezen.'],
      presentation: ['Botoia sakatu gabe irakurri', 'Irakurgailuak berak irakurtzen du kode bat hurbiltzean.'],
      enter: ['Intro amaieran', 'Irakurketa bakoitza Intro batekin amaitzen da, Farmaticek espero duen bezala.'],
      lowBeep: ['Txistu-hots baxua', 'Zarata gutxiago; baliagarria bateria baxuaz maiz ohartarazten badu.'],
      volumeNormal: ['Bolumen normalera itzuli', 'Txistu-hots baxua desegiten du.'],
      gsHoneywell: ['GS bereizlea Farmaticerako', 'Ctrl+X modua Windowserako, aurrizkia eta atzizkia mantenduz.'],
      gsTera: [
        'GS bereizlea Farmaticerako',
        'Teraren laguntza-zerbitzuak bidalitako kodea (ez dago eskuliburuan). DataMatrixak parentesirik gabe eta GS bereizlearekin ateratzen dira.',
      ],
      gsHoneywellAlt: ['5. urratsaren ordezkoa', '5. urratsak funtzionatzeari uzten badio bakarrik (Ctrl+X Windowserako, aurrizki eta atzizkirik gabe).'],
      gsHoneywellUndo: ['5. urratsa desegin', 'Bereizlea fabrikako baliora itzultzen du.'],
      trigger: ['Botoia sakatuta irakurri', '«Botoia sakatu gabe irakurri» desegiten du.'],
    },
  },
  gl: {
    navCoupons: 'Follas de cupóns',
    navScanners: 'Lectores de códigos',
    indexTitle: 'Configurar lectores de códigos de barras para Farmatic',
    indexShort: 'Lectores de códigos de barras',
    indexDesc:
      'Códigos de configuración probados para que o teu lector de códigos de barras funcione con Farmatic en Windows: teclado español, Intro ao final e separador GS para os DataMatrix dos medicamentos.',
    indexIntro:
      'Configuracións probadas en farmacias reais con <strong>Farmatic</strong> e <strong>Windows</strong>. Escolle o teu lector e escanea os seus códigos en orde, desde a pantalla ou impresos.',
    tested: 'Probado con Farmatic · Windows',
    seeConfig: 'Ver a configuración',
    howToKnow: 'É o teu?',
    identifyLabel: 'Mira a etiqueta do lector:',
    pageTitle: (s) => `Configurar o lector ${s.brand} ${s.model} para Farmatic`,
    pageDesc: (s) =>
      `Códigos de configuración, en orde, para que o lector ${s.brand} ${s.model} funcione con Farmatic en Windows. Para escanear desde a pantalla ou imprimir en PDF.`,
    howTo:
      'Co lector aceso, escanea os códigos de arriba abaixo, un a un. Despois de cada código debe soar un pitido.',
    screenTip: 'Se non le desde a pantalla, sobe o brillo ou imprime o PDF.',
    steps: 'Configuración',
    optionsTitle: 'Opcións (só se fai falta)',
    check: 'Comprobar',
    checkText:
      'Abre Farmatic e le un medicamento con código cadrado (DataMatrix). Debe recoñecer o lote, a caducidade e o número de serie sen dar ningún erro.',
    pdf: 'Descargar PDF para imprimir',
    links: 'Documentación do fabricante',
    back: '← Todos os lectores',
    payload: 'Contido',
    faqTitle: 'Preguntas frecuentes',
    faq: [
      [
        'Podo escanear os códigos directamente desde a pantalla?',
        'Normalmente si. Se o lector non reacciona, sobe o brillo da pantalla, afasta un pouco o lector ou imprime o PDF.',
      ],
      [
        'Por que fai falta o separador GS?',
        'O código DataMatrix dos medicamentos leva xuntos o código nacional, o lote, a caducidade e o número de serie. Farmatic necesita un carácter invisible (GS) entre eles para separalos. Coa configuración de fábrica moitos lectores non o envían, e Farmatic dá erro ou mestura os datos.',
      ],
      [
        'Como volvo atrás se algo sae mal?',
        'Escanea o primeiro código (configuración de fábrica) e volve comezar desde o principio.',
      ],
      [
        'O meu lector non aparece. Podedes engadilo?',
        'Escríbenos desde «Contactar» coa marca e o modelo (está na etiqueta do lector). Se temos o manual, podemos preparar e probar a súa configuración.',
      ],
    ],
    linkLabels: {
      quickStart: 'Guía rápida (Honeywell, PDF, inglés)',
      userGuide: 'Manual de usuario completo (PDF, inglés)',
      ctrlX: 'Artigo de Honeywell sobre o modo Ctrl+X (inglés)',
      teraManualEs: 'Manual de usuario de Tera (PDF, castelán)',
      teraManualEn: 'Manual de usuario de Tera (PDF, inglés)',
      teraManuals: 'Todos os manuais na web de Tera',
    },
    s: {
      factory: ['Volver á configuración de fábrica', 'Parte sempre dun estado coñecido.'],
      kbdEs: ['Teclado en español', 'Para que os símbolos e as letras saian ben en Windows.'],
      presentation: ['Ler sen premer o botón', 'O lector le só ao achegarlle un código.'],
      enter: ['Intro ao final', 'Cada lectura remata cun Intro, como espera Farmatic.'],
      lowBeep: ['Pitido baixo', 'Menos ruído; útil se avisa a miúdo de batería baixa.'],
      volumeNormal: ['Volver ao volume normal', 'Desfai o pitido baixo.'],
      gsHoneywell: ['Separador GS para Farmatic', 'Modo Ctrl+X para Windows, conservando prefixo e sufixo.'],
      gsTera: [
        'Separador GS para Farmatic',
        'Código enviado polo soporte de Tera (non aparece no manual). Os DataMatrix saen sen parénteses e co separador GS.',
      ],
      gsHoneywellAlt: ['Paso 5 alternativo', 'Só se o paso 5 deixa de funcionar (Ctrl+X para Windows sen prefixo nin sufixo).'],
      gsHoneywellUndo: ['Desfacer o paso 5', 'Devolve o separador ao valor de fábrica.'],
      trigger: ['Ler premendo o botón', 'Desfai «Ler sen premer o botón».'],
    },
  },
};
