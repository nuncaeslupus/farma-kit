/* Bilingual dictionary (ca/es) — ported from the Apps Script app. */
type Dict = Record<string, string | ((...a: string[]) => string)>;

export const I18N: { ca: Dict; es: Dict } = {
  ca: {
    // Keyword-first (people search «cupons precinte» / «recepta electrònica»,
    // not the brand). Must stay in sync with ca/index.html's <title>.
    docTitle: 'Emplenar fulls de cupons precinte per a la recepta electrònica — Farma-Kit',
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
      "Només la capçalera de cada full: la UP de la farmàcia, el mes i l'any, la numeració correlativa dels fulls i, si ho necessites, les dades del segell del titular. El resultat és un PDF a punt per imprimir sobre els fulls oficials de cupons; el full en si mai no s'imprimeix, només les teves dades.",
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
    docTitle: 'Rellenar hojas de cupones precinto para la receta electrónica — Farma-Kit',
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
      'Son las hojas oficiales que cada Colegio de Farmacéuticos distribuye a las farmacias, normalmente a través del mayorista, y donde se pegan los cupones precinto de los envases dispensados con receta electrónica: son el justificante para la facturación y el control de las dispensaciones del sistema público de salud y de las mutualidades (MUFACE, ISFAS, MUGEJU). En Cataluña se conocen como «fulls de cupons precinte».',
    seoQ2: '¿Qué rellena exactamente esta herramienta?',
    seoA2:
      'Solo la cabecera de cada hoja: la UP de la farmacia, el mes y el año, la numeración correlativa de las hojas y, si lo necesitas, los datos del sello del titular. El resultado es un PDF listo para imprimir sobre las hojas oficiales de cupones; la hoja en sí nunca se imprime, solo tus datos.',
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
};

export type Lang = 'ca' | 'es';

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
