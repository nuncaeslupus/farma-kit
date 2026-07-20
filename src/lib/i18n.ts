/* Bilingual dictionary (ca/es) — ported from the Apps Script app. */
type Dict = Record<string, string | ((...a: string[]) => string)>;

export const I18N: { ca: Dict; es: Dict; eu: Dict; gl: Dict } = {
  ca: {
    // Keyword-first (people search «cupons precinte» / «recepta electrònica»,
    // not the brand). Must stay in sync with ca/index.html's <title>.
    docTitle: 'Emplenar fulls de cupons precinte per a la recepta electrònica — FarmaKit',
    appTitle:
      'Emplenador de <span class="lo">fulls de cupons precinte</span><br>per a la recepta electrònica',
    intro:
      "Aquesta utilitat et permetrà omplir de manera senzilla, ràpida i econòmica la capçalera dels fulls de cupons precinte de la teva farmàcia. Només s'imprimiran les dades de la farmàcia sobre els fulls oficials de cupons, disponibles a través del majorista.",
    chooseFirst: 'Tria el teu Col·legi de Farmacèutics',
    gateHint: 'Selecciona un col·legi amb plantilla disponible per continuar.',
    cnLabel: 'Codi Nacional dels fulls',
    privacy: "Les dades es processen al teu navegador i no s'envien enlloc",
    noCookies: 'No es fan servir cookies',
    instr: 'Instruccions',
    step1: 'Posa a la impressora el número de papers (fulls de cupons) que necessitis imprimir.',
    step2:
      'Omple el formulari següent. Per fer una prova posa el número <span class="kbd">1</span> al camp <em>Quantitat de fulls</em>.',
    step3: 'Genera el document i imprimeix-lo <em>sobre</em> els fulls de cupons.',
    oblig: 'Informació general',
    obligSub: 'Per omplir la capçalera dels fulls.',
    colegi: 'Col·legi de Farmacèutics',
    colegiPh: 'Selecciona el teu col·legi…',
    searchPh: 'Cerca…',
    noResults: 'Cap col·legi coincideix amb la cerca.',
    reqBtn: 'Demanar',
    reqStatus: 'Encara no disponible',
    noTemplate:
      "Encara no tenim la plantilla d'aquest col·legi. Demana-la i l'afegirem perquè la puguis fer servir.",
    up: 'UP de la farmàcia',
    mes: 'Mes i any',
    full: 'Full inicial',
    // Not "Número de…": Chrome reads «Número» next to the name/address fields as
    // a card number and offers credit-card autofill. Verified by bisection.
    num: 'Quantitat de fulls',
    pages: 'Pàgines a imprimir',
    segell: 'Generar també les dades del segell',
    cognoms: 'Cognoms del titular',
    nom: 'Nom del titular',
    nif: 'NIF',
    cp: 'Codi postal',
    adreca: 'Adreça',
    poblacio: 'Població',
    provincia: 'Província',
    provinciaPh: '—',
    remember: "Recorda'm",
    tagline: 'Eines per a la farmàcia',
    contact: 'Contactar',
    share: 'Compartir',
    shareCopied: 'Enllaç copiat!',
    githubLink: 'Codi a GitHub',
    generar: 'Generar Document',
    errUp: 'Ha de ser un número de 5 xifres.',
    // Shown next to the "Mes i any" label only where type="month" has no native
    // picker (Firefox/Safari) and the raw value must be typed. `ym` is the current
    // year-month, so the example is always live.
    mesEg: (ym: string) => ` (p. ex. ${ym})`,
    errMes: 'Format del mes: AAAA-MM (per exemple, 2026-07).',
    errNat: 'Introdueix un número enter més gran que 0.',
    errNif: 'NIF no vàlid.',
    errCp: 'Codi postal no vàlid (5 xifres).',
    errRequired: 'Cal omplir aquest camp per generar el segell.',
    errColegi: 'Selecciona un col·legi amb plantilla disponible.',
    errRange: (max: string) =>
      'El full final supera ' + max + ': redueix el full inicial o la quantitat de fulls.',
    loadErr: "No s'ha pogut carregar la llista de plantilles. Comprova la connexió i torna-ho a provar.",
    tplErr: "No s'ha pogut carregar la plantilla. Comprova la connexió i torna-ho a provar.",
    retry: 'Torna-ho a provar',
    continuar: 'Continuar',
    cancel: 'Cancel·lar',
    // No "Compte!" prefix — the dialog title (alertLabel) already carries it.
    warnAhead: (mes: string) =>
      'Estàs generant pàgines avançades per al mes <strong>' + mes + '</strong>. És correcte?',
    warnCurrent: (mes: string) =>
      "S'estan generant les primeres pàgines per al mes <strong>" +
      mes +
      '</strong>, que està acabant. És correcte?',
    // Accessible name of the pre-generate warning dialog (visually hidden).
    alertLabel: 'Alerta!',
    alertText: 'Aquesta pàgina no pertany a cap Col·legi de Farmacèutics',
    theme_dark: 'Fosc',
    theme_light: 'Clar',
    genTitle: 'Generant el document…',
    genDone: 'Document generat',
    genErrTitle: 'No s’ha pogut generar',
    genClose: 'Tancar',
    genDownload: 'Obrir / Descarregar PDF',
    genErrGeneric: 'Hi ha hagut un error generant el document. Torna-ho a provar d’aquí una estona.',
    pages_fmt: (a: string, b: string, n: string) =>
      'Del full ' + a + ' al ' + b + ' <span class="dim">· ' + n + ' fulls</span>',
    // Static about/FAQ section — lives pre-rendered in the HTML shells (outside
    // fk-root) so crawlers see it without JS; these keys keep it in sync with
    // the runtime language toggle. Edit the shells and the FAQPage JSON-LD
    // there when editing these.
    seoTitle: 'Preguntes freqüents',
    seoQ1: 'Què són els fulls de cupons precinte?',
    seoA1:
      "Són els fulls oficials que cada Col·legi de Farmacèutics distribueix a les farmàcies, normalment a través del majorista, i on s'enganxen els cupons precinte dels envasos dispensats amb recepta electrònica: són el justificant per a la facturació i el control de les dispensacions del sistema públic de salut i de les mutualitats (MUFACE, ISFAS, MUGEJU).",
    seoQ2: 'Què emplena exactament aquesta eina?',
    seoA2:
      "Només la capçalera de cada full: la UP de la farmàcia, el mes i l'any, la numeració correlativa dels fulls i, si ho necessites, les dades del segell del titular. El resultat és un PDF a punt per imprimir sobre els fulls oficials de cupons; el full en si mai no s'imprimeix, només les teves dades. Els fulls els pots aconseguir a través del teu majorista o imprimint-los si el teu Col·legi de Farmacèutics te'n proporciona la plantilla.",
    seoQ3: 'És gratuït? Cal registrar-se?',
    seoA3:
      'Sí: és una eina gratuïta i de codi obert (llicència MIT, <a href="https://github.com/nuncaeslupus/farma-kit" target="_blank" rel="noopener">codi a GitHub</a>). No hi ha registre, no hi ha comptes i el lloc no fa servir cookies.',
    seoQ4: 'Què passa amb les dades de la meva farmàcia?',
    seoA4:
      "No surten del teu ordinador: el PDF es genera localment, al teu propi navegador, i no s'envia res a cap servidor. L'opció «Recorda'm» desa les dades únicament al teu navegador per a la propera visita.",
    seoQ5: 'Amb quins col·legis de farmacèutics funciona?',
    seoA5:
      "Avui hi ha disponibles els fulls dels col·legis de Barcelona, Girona, Lleida i Tarragona, que comparteixen un mateix model. Si el teu col·legi encara no hi apareix, demana'l des de la mateixa aplicació i n'afegirem la plantilla.",
  },
  es: {
    // Keyword-first (people search «cupones precinto» / «receta electrónica»,
    // not the brand). Must stay in sync with index.html's <title>.
    docTitle: 'Rellenar hojas de cupones precinto para la receta electrónica — FarmaKit',
    appTitle:
      'Rellenador de <span class="lo">hojas de cupones precinto</span><br>para la receta electrónica',
    intro:
      'Esta utilidad te permitirá rellenar de forma sencilla, rápida y económica la cabecera de las hojas de cupones precinto de tu farmacia. Solo se imprimirán los datos de la farmacia sobre las hojas oficiales de cupones, disponibles a través del mayorista.',
    chooseFirst: 'Elige tu Colegio de Farmacéuticos',
    gateHint: 'Selecciona un colegio con plantilla disponible para continuar.',
    cnLabel: 'Código nacional de las hojas',
    privacy: 'Los datos se procesan en tu navegador y no se envían a ningún sitio',
    noCookies: 'No se usan cookies',
    instr: 'Instrucciones',
    step1: 'Pon en la impresora el número de papeles (hojas de cupones) que necesites imprimir.',
    step2:
      'Rellena el formulario siguiente. Para hacer una prueba pon el número <span class="kbd">1</span> en el campo <em>Cantidad de hojas</em>.',
    step3: 'Genera el documento e imprímelo <em>sobre</em> las hojas de cupones.',
    oblig: 'Información general',
    obligSub: 'Para rellenar la cabecera de las hojas.',
    colegi: 'Colegio de Farmacéuticos',
    colegiPh: 'Selecciona tu colegio…',
    searchPh: 'Buscar…',
    noResults: 'Ningún colegio coincide con la búsqueda.',
    reqBtn: 'Pedir',
    reqStatus: 'Aún no disponible',
    noTemplate:
      'Todavía no tenemos la plantilla de este colegio. Pídela y la añadiremos para que puedas usarla.',
    up: 'UP de la farmacia',
    mes: 'Mes y año',
    full: 'Hoja inicial',
    num: 'Cantidad de hojas',
    pages: 'Páginas a imprimir',
    segell: 'Generar también los datos del sello',
    cognoms: 'Apellidos del titular',
    nom: 'Nombre del titular',
    nif: 'NIF',
    cp: 'Código postal',
    adreca: 'Dirección',
    poblacio: 'Población',
    provincia: 'Provincia',
    provinciaPh: '—',
    remember: 'Recuérdame',
    tagline: 'Herramientas para la farmacia',
    contact: 'Contactar',
    share: 'Compartir',
    shareCopied: '¡Enlace copiado!',
    githubLink: 'Código en GitHub',
    generar: 'Generar Documento',
    errUp: 'Debe ser un número de 5 cifras.',
    mesEg: (ym: string) => ` (p. ej. ${ym})`,
    errMes: 'Formato del mes: AAAA-MM (por ejemplo, 2026-07).',
    errNat: 'Introduce un número entero mayor que 0.',
    errNif: 'NIF no válido.',
    errCp: 'Código postal no válido (5 cifras).',
    errRequired: 'Rellena este campo para generar el sello.',
    errColegi: 'Selecciona un colegio con plantilla disponible.',
    errRange: (max: string) =>
      'La hoja final supera ' + max + ': reduce la hoja inicial o la cantidad de hojas.',
    loadErr: 'No se pudo cargar la lista de plantillas. Comprueba la conexión y vuelve a intentarlo.',
    tplErr: 'No se pudo cargar la plantilla. Comprueba la conexión y vuelve a intentarlo.',
    retry: 'Reintentar',
    continuar: 'Continuar',
    cancel: 'Cancelar',
    // No "¡Atención!" prefix — the dialog title (alertLabel) already carries it.
    warnAhead: (mes: string) =>
      'Estás generando páginas adelantadas para el mes <strong>' +
      mes +
      '</strong>. ¿Es correcto?',
    warnCurrent: (mes: string) =>
      'Se están generando las primeras páginas para el mes <strong>' +
      mes +
      '</strong>, que está terminando. ¿Es correcto?',
    alertLabel: '¡Atención!',
    alertText: 'Esta página no pertenece a ningún Colegio de Farmacéuticos',
    theme_dark: 'Oscuro',
    theme_light: 'Claro',
    genTitle: 'Generando el documento…',
    genDone: 'Documento generado',
    genErrTitle: 'No se ha podido generar',
    genClose: 'Cerrar',
    genDownload: 'Abrir / Descargar PDF',
    genErrGeneric: 'Ha ocurrido un error generando el documento. Inténtalo de nuevo dentro de un rato.',
    pages_fmt: (a: string, b: string, n: string) =>
      'De la hoja ' + a + ' a la ' + b + ' <span class="dim">· ' + n + ' hojas</span>',
    // See the note on the Catalan seo* block.
    seoTitle: 'Preguntas frecuentes',
    seoQ1: '¿Qué son las hojas de cupones precinto?',
    seoA1:
      'Son las hojas oficiales que cada Colegio de Farmacéuticos distribuye a las farmacias, normalmente a través del mayorista, y donde se pegan los cupones precinto de los envases dispensados con receta electrónica: son el justificante para la facturación y el control de las dispensaciones del sistema público de salud y de las mutualidades (MUFACE, ISFAS, MUGEJU).',
    seoQ2: '¿Qué rellena exactamente esta herramienta?',
    seoA2:
      'Solo la cabecera de cada hoja: la UP de la farmacia, el mes y el año, la numeración correlativa de las hojas y, si lo necesitas, los datos del sello del titular. El resultado es un PDF listo para imprimir sobre las hojas oficiales de cupones; la hoja en sí nunca se imprime, solo tus datos. Las hojas las puedes conseguir a través de tu mayorista o imprimiéndolas si tu Colegio de Farmacéuticos te proporciona la plantilla.',
    seoQ3: '¿Es gratis? ¿Hay que registrarse?',
    seoA3:
      'Sí: es una herramienta gratuita y de código abierto (licencia MIT, <a href="https://github.com/nuncaeslupus/farma-kit" target="_blank" rel="noopener">código en GitHub</a>). No hay registro, no hay cuentas y el sitio no usa cookies.',
    seoQ4: '¿Qué pasa con los datos de mi farmacia?',
    seoA4:
      'No salen de tu ordenador: el PDF se genera localmente, en tu propio navegador, y no se envía nada a ningún servidor. La opción «Recuérdame» guarda los datos únicamente en tu navegador para la próxima visita.',
    seoQ5: '¿Con qué colegios de farmacéuticos funciona?',
    seoA5:
      'Hoy están disponibles las hojas de los colegios de Barcelona, Girona, Lleida y Tarragona, que comparten un mismo modelo. Si tu colegio todavía no aparece, pídelo desde la propia aplicación y añadiremos su plantilla.',
  },
  // Euskara (eu) — domain terms sourced from Osakidetza / euskadi.eus, Euskalterm
  // and the Basque farmacéuticos' colleges (errezeta elektronikoa, zigilu-kupoia,
  // Farmazialarien Elkargoa, farmazialaria, handizkaria, goiburua, zigilua).
  // Machine-drafted against those sources — get a native-speaker pass before a
  // wide launch. Keys mirror es exactly (tests/i18n.test.ts enforces this).
  eu: {
    docTitle: 'Zigilu-kupoien orriak bete errezeta elektronikorako — FarmaKit',
    appTitle:
      '<span class="lo">Zigilu-kupoien orriak</span> betetzeko tresna<br>errezeta elektronikorako',
    intro:
      'Tresna honek zure farmaziako zigilu-kupoien orrien goiburua modu erraz, azkar eta ekonomikoan betetzeko aukera emango dizu. Farmaziaren datuak baino ez dira inprimatuko kupoien orri ofizialen gainean, handizkariaren bidez eskuragarri daudenak.',
    chooseFirst: 'Aukeratu zure Farmazialarien Elkargoa',
    gateHint: 'Aurrera egiteko, hautatu txantiloia eskuragarri duen elkargo bat.',
    cnLabel: 'Orrien kode nazionala',
    privacy: 'Datuak zure nabigatzailean prozesatzen dira, eta ez dira inora bidaltzen',
    noCookies: 'Ez da cookierik erabiltzen',
    instr: 'Jarraibideak',
    step1: 'Jarri inprimagailuan inprimatu behar duzun paper kopurua (kupoi-orriak).',
    step2:
      'Bete hurrengo formularioa. Proba bat egiteko, jarri <span class="kbd">1</span> zenbakia <em>Orri kopurua</em> eremuan.',
    step3: 'Sortu dokumentua eta inprimatu kupoi-orrien <em>gainean</em>.',
    oblig: 'Informazio orokorra',
    obligSub: 'Orrien goiburua betetzeko.',
    colegi: 'Farmazialarien Elkargoa',
    colegiPh: 'Hautatu zure elkargoa…',
    searchPh: 'Bilatu…',
    noResults: 'Ez dago bilaketarekin bat datorren elkargorik.',
    reqBtn: 'Eskatu',
    reqStatus: 'Oraindik ez dago eskuragarri',
    noTemplate:
      'Oraindik ez dugu elkargo honen txantiloia. Eskatu, eta gehituko dugu erabili ahal izan dezazun.',
    up: 'Farmaziaren UP',
    mes: 'Hilabetea eta urtea',
    full: 'Hasierako orria',
    num: 'Orri kopurua',
    pages: 'Inprimatzeko orrialdeak',
    segell: 'Zigiluaren datuak ere sortu',
    cognoms: 'Titularraren abizenak',
    nom: 'Titularraren izena',
    nif: 'IFZ',
    cp: 'Posta-kodea',
    adreca: 'Helbidea',
    poblacio: 'Herria',
    provincia: 'Probintzia',
    provinciaPh: '—',
    remember: 'Gogoratu ni',
    tagline: 'Farmaziarako tresnak',
    contact: 'Harremanetarako',
    share: 'Partekatu',
    shareCopied: 'Esteka kopiatu da!',
    githubLink: 'Kodea GitHuben',
    generar: 'Sortu dokumentua',
    errUp: '5 zifrako zenbaki bat izan behar du.',
    mesEg: (ym: string) => ` (adib. ${ym})`,
    errMes: 'Hilabetearen formatua: UUUU-HH (adibidez, 2026-07).',
    errNat: 'Idatzi 0 baino handiagoko zenbaki oso bat.',
    errNif: 'IFZ baliogabea.',
    errCp: 'Posta-kode baliogabea (5 zifra).',
    errRequired: 'Bete eremu hau zigilua sortzeko.',
    errColegi: 'Hautatu txantiloia eskuragarri duen elkargo bat.',
    errRange: (max: string) =>
      'Azken orriak ' + max + ' gainditzen du: murriztu hasierako orria edo orri kopurua.',
    loadErr: 'Ezin izan da txantiloien zerrenda kargatu. Egiaztatu konexioa eta saiatu berriro.',
    tplErr: 'Ezin izan da txantiloia kargatu. Egiaztatu konexioa eta saiatu berriro.',
    retry: 'Saiatu berriro',
    continuar: 'Jarraitu',
    cancel: 'Utzi',
    warnAhead: (mes: string) =>
      '<strong>' + mes + '</strong> hilabeterako aurreratutako orrialdeak sortzen ari zara. Zuzena da?',
    warnCurrent: (mes: string) =>
      '<strong>' +
      mes +
      '</strong> hilabeterako lehen orrialdeak sortzen ari dira; hilabete hori amaitzen ari da. Zuzena da?',
    alertLabel: 'Kontuz!',
    alertText: 'Orri hau ez dagokio inongo Farmazialarien Elkargori',
    theme_dark: 'Iluna',
    theme_light: 'Argia',
    genTitle: 'Dokumentua sortzen…',
    genDone: 'Dokumentua sortu da',
    genErrTitle: 'Ezin izan da sortu',
    genClose: 'Itxi',
    genDownload: 'PDFa ireki / deskargatu',
    genErrGeneric: 'Errore bat gertatu da dokumentua sortzean. Saiatu berriro handik gutxira.',
    pages_fmt: (a: string, b: string, n: string) =>
      a + '. orritik ' + b + '. orrira <span class="dim">· ' + n + ' orri</span>',
    seoTitle: 'Ohiko galderak',
    seoQ1: 'Zer dira zigilu-kupoien orriak?',
    seoA1:
      'Farmazialarien Elkargo bakoitzak farmaziei banatzen dizkien orri ofizialak dira, normalean handizkariaren bidez, eta bertan itsasten dira errezeta elektronikoarekin emandako ontzien zigilu-kupoiak: osasun-sistema publikoaren eta mutualitateen (MUFACE, ISFAS, MUGEJU) dispentsazioen fakturazioaren eta kontrolaren egiaztagiria dira.',
    seoQ2: 'Zer betetzen du zehazki tresna honek?',
    seoA2:
      'Orri bakoitzaren goiburua baino ez: farmaziaren UP, hilabetea eta urtea, orrien zenbakera korrelatiboa eta, behar baduzu, titularraren zigiluaren datuak. Emaitza kupoien orri ofizialen gainean inprimatzeko prest dagoen PDF bat da; orria bera ez da inoiz inprimatzen, zure datuak baino ez. Orriak zure handizkariaren bidez lor ditzakezu, edo zuk zeuk inprimatuz, zure Farmazialarien Elkargoak txantiloia ematen badizu.',
    seoQ3: 'Doakoa da? Izena eman behar da?',
    seoA3:
      'Bai: doako eta kode irekiko tresna bat da (MIT lizentzia, <a href="https://github.com/nuncaeslupus/farma-kit" target="_blank" rel="noopener">kodea GitHuben</a>). Ez dago izen-ematerik, ez dago konturik, eta guneak ez du cookierik erabiltzen.',
    seoQ4: 'Zer gertatzen da nire farmaziaren datuekin?',
    seoA4:
      'Ez dira zure ordenagailutik ateratzen: PDFa lokalki sortzen da, zure nabigatzailean bertan, eta ez da ezer inongo zerbitzarira bidaltzen. «Gogoratu ni» aukerak datuak zure nabigatzailean bakarrik gordetzen ditu, hurrengo bisitarako.',
    seoQ5: 'Zein farmazialarien elkargorekin funtzionatzen du?',
    seoA5:
      'Gaur egun Barcelona, Girona, Lleida eta Tarragonako elkargoen orriak daude eskuragarri, eredu bera partekatzen dutenak. Zure elkargoa oraindik ez bada agertzen, eskatu aplikazioan bertan, eta haren txantiloia gehituko dugu.',
  },
  // Galego (gl) — RAG-normative spelling (never reintegrationist); domain terms
  // from SERGAS (receita electrónica), the Colexios Oficiais de Farmacéuticos
  // (cofc.gal) and the RAG dictionary (folla, selo, enderezo, distribuidor).
  // Machine-drafted against those sources — get a native-speaker pass before a
  // wide launch. Keys mirror es exactly (tests/i18n.test.ts enforces this).
  gl: {
    docTitle: 'Encher follas de cupóns precinto para a receita electrónica — FarmaKit',
    appTitle:
      'Enchedor de <span class="lo">follas de cupóns precinto</span><br>para a receita electrónica',
    intro:
      'Esta utilidade permitirache encher de forma sinxela, rápida e económica a cabeceira das follas de cupóns precinto da túa farmacia. Só se imprimirán os datos da farmacia sobre as follas oficiais de cupóns, dispoñibles a través do distribuidor.',
    chooseFirst: 'Escolle o teu Colexio de Farmacéuticos',
    gateHint: 'Selecciona un colexio con modelo dispoñible para continuar.',
    cnLabel: 'Código nacional das follas',
    privacy: 'Os datos procésanse no teu navegador e non se envían a ningún sitio',
    noCookies: 'Non se usan cookies',
    instr: 'Instrucións',
    step1: 'Pon na impresora o número de papeis (follas de cupóns) que precises imprimir.',
    step2:
      'Enche o formulario seguinte. Para facer unha proba pon o número <span class="kbd">1</span> no campo <em>Número de follas</em>.',
    step3: 'Xera o documento e imprímeo <em>sobre</em> as follas de cupóns.',
    oblig: 'Información xeral',
    obligSub: 'Para encher a cabeceira das follas.',
    colegi: 'Colexio de Farmacéuticos',
    colegiPh: 'Selecciona o teu colexio…',
    searchPh: 'Buscar…',
    noResults: 'Ningún colexio coincide coa busca.',
    reqBtn: 'Pedir',
    reqStatus: 'Aínda non dispoñible',
    noTemplate:
      'Aínda non temos o modelo deste colexio. Pídeo e engadirémolo para que o poidas usar.',
    up: 'UP da farmacia',
    mes: 'Mes e ano',
    full: 'Folla inicial',
    num: 'Número de follas',
    pages: 'Páxinas para imprimir',
    segell: 'Xerar tamén os datos do selo',
    cognoms: 'Apelidos do titular',
    nom: 'Nome do titular',
    nif: 'NIF',
    cp: 'Código postal',
    adreca: 'Enderezo',
    poblacio: 'Localidade',
    provincia: 'Provincia',
    provinciaPh: '—',
    remember: 'Lémbrame',
    tagline: 'Ferramentas para a farmacia',
    contact: 'Contactar',
    share: 'Compartir',
    shareCopied: 'Ligazón copiada!',
    githubLink: 'Código en GitHub',
    generar: 'Xerar documento',
    errUp: 'Debe ser un número de 5 cifras.',
    mesEg: (ym: string) => ` (p. ex. ${ym})`,
    errMes: 'Formato do mes: AAAA-MM (por exemplo, 2026-07).',
    errNat: 'Introduce un número enteiro maior que 0.',
    errNif: 'NIF non válido.',
    errCp: 'Código postal non válido (5 cifras).',
    errRequired: 'Enche este campo para xerar o selo.',
    errColegi: 'Selecciona un colexio con modelo dispoñible.',
    errRange: (max: string) =>
      'A folla final supera ' + max + ': reduce a folla inicial ou o número de follas.',
    loadErr: 'Non se puido cargar a lista de modelos. Comproba a conexión e téntao de novo.',
    tplErr: 'Non se puido cargar o modelo. Comproba a conexión e téntao de novo.',
    retry: 'Tentar de novo',
    continuar: 'Continuar',
    cancel: 'Cancelar',
    warnAhead: (mes: string) =>
      'Estás a xerar páxinas adiantadas para o mes <strong>' + mes + '</strong>. É correcto?',
    warnCurrent: (mes: string) =>
      'Estanse a xerar as primeiras páxinas para o mes <strong>' +
      mes +
      '</strong>, que está a rematar. É correcto?',
    alertLabel: 'Atención!',
    alertText: 'Esta páxina non pertence a ningún Colexio de Farmacéuticos',
    theme_dark: 'Escuro',
    theme_light: 'Claro',
    genTitle: 'Xerando o documento…',
    genDone: 'Documento xerado',
    genErrTitle: 'Non se puido xerar',
    genClose: 'Pechar',
    genDownload: 'Abrir / Descargar PDF',
    genErrGeneric: 'Produciuse un erro ao xerar o documento. Téntao de novo dentro dun anaco.',
    pages_fmt: (a: string, b: string, n: string) =>
      'Da folla ' + a + ' á ' + b + ' <span class="dim">· ' + n + ' follas</span>',
    seoTitle: 'Preguntas frecuentes',
    seoQ1: 'Que son as follas de cupóns precinto?',
    seoA1:
      'Son as follas oficiais que cada Colexio de Farmacéuticos distribúe ás farmacias, normalmente a través do distribuidor, e onde se pegan os cupóns precinto dos envases dispensados con receita electrónica: son o xustificante para a facturación e o control das dispensacións do sistema público de saúde e das mutualidades (MUFACE, ISFAS, MUGEJU).',
    seoQ2: 'Que enche exactamente esta ferramenta?',
    seoA2:
      'Só a cabeceira de cada folla: a UP da farmacia, o mes e o ano, a numeración correlativa das follas e, se o precisas, os datos do selo do titular. O resultado é un PDF listo para imprimir sobre as follas oficiais de cupóns; a folla en si nunca se imprime, só os teus datos. As follas podes conseguilas a través do teu distribuidor ou imprimíndoas se o teu Colexio de Farmacéuticos che proporciona o modelo.',
    seoQ3: 'É de balde? Hai que rexistrarse?',
    seoA3:
      'Si: é unha ferramenta gratuíta e de código aberto (licenza MIT, <a href="https://github.com/nuncaeslupus/farma-kit" target="_blank" rel="noopener">código en GitHub</a>). Non hai rexistro, non hai contas e o sitio non usa cookies.',
    seoQ4: 'Que pasa cos datos da miña farmacia?',
    seoA4:
      'Non saen do teu ordenador: o PDF xérase localmente, no teu propio navegador, e non se envía nada a ningún servidor. A opción «Lémbrame» garda os datos unicamente no teu navegador para a próxima visita.',
    seoQ5: 'Con que colexios de farmacéuticos funciona?',
    seoA5:
      'Hoxe están dispoñibles as follas dos colexios de Barcelona, Girona, Lleida e Tarragona, que comparten un mesmo modelo. Se o teu colexio aínda non aparece, pídeo desde a propia aplicación e engadiremos o seu modelo.',
  },
};

export type Lang = 'ca' | 'es' | 'eu' | 'gl';

/** Apply translations to [data-i18n] / [data-i18n-ph] under `root`. */
export function applyLang(root: ParentNode, lang: Lang): void {
  const d = I18N[lang];
  document.documentElement.lang = lang;
  if (typeof d.docTitle === 'string') document.title = d.docTitle;
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const k = el.getAttribute('data-i18n')!;
    const v = d[k];
    if (typeof v !== 'string') return;
    if (el.hasAttribute('data-i18n-html') || k === 'appTitle' || k === 'intro') el.innerHTML = v;
    else el.textContent = v;
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-ph]').forEach((el) => {
    const v = d[el.getAttribute('data-i18n-ph')!];
    if (typeof v === 'string') {
      el.setAttribute('placeholder', v);
      // Placeholder-only fields have no visible label; mirror it as the
      // accessible name so it survives language switches.
      el.setAttribute('aria-label', v);
    }
  });
}
