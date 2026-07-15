/* Bilingual dictionary (ca/es) — ported from the Apps Script app. */
type Dict = Record<string, string | ((...a: string[]) => string)>;

export const I18N: { ca: Dict; es: Dict } = {
  ca: {
    docTitle: 'Farma-Kit - Emplenador de fulls de cupons',
    appTitle:
      'Emplenador de <span class="lo">fulls de cupons precinte</span><br>per a la recepta electrònica',
    intro:
      "Aquesta utilitat et permetrà omplir de manera senzilla, ràpida i econòmica la capçalera dels fulls de cupons precinte de la teva farmàcia. Només s'imprimiran les dades de la farmàcia sobre els fulls oficials de cupons, disponibles a través del majorista.",
    chooseFirst: 'Tria el teu Col·legi de Farmacèutics',
    gateHint: 'Selecciona un col·legi amb plantilla disponible per continuar.',
    cnLabel: 'Codi Nacional dels fulls',
    privacy: "Les dades es processen al teu ordinador i no s'envien enlloc",
    noCookies: 'No es fan servir cookies',
    instr: 'Instruccions',
    step1: 'Posa a la impressora el número de papers (fulls de cupons) que necessitis imprimir.',
    step2:
      'Omple el formulari següent. Per fer una prova posa el número <span class="kbd">1</span> al camp <em>Número de fulls</em>.',
    step3: 'Genera el document i imprimeix-lo <em>sobre</em> els fulls de cupons.',
    oblig: 'Informació general',
    obligSub: 'Per omplir la capçalera dels fulls.',
    colegi: 'Col·legi de Farmacèutics',
    colegiPh: 'Selecciona el teu col·legi…',
    searchPh: 'Cerca…',
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
    dismiss: 'No mostrar més',
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
    contact: 'Contactar',
    generar: 'Generar Document',
    errUp: 'Ha de ser un número de 5 xifres.',
    errNat: 'Introdueix un número enter més gran que 0.',
    errNif: 'NIF no vàlid.',
    errCp: 'Codi postal no vàlid (5 xifres).',
    errRequired: 'Cal omplir aquest camp per generar el segell.',
    errColegi: 'Selecciona un col·legi amb plantilla disponible.',
    showAgain: "Mostra l'avís legal",
    continuar: 'Continuar',
    cancel: 'Cancel·lar',
    warnAhead: (mes: string) =>
      'Compte! Estàs generant pàgines avançades per al mes <strong>' + mes + '</strong>. És correcte?',
    warnCurrent: (mes: string) =>
      "Compte! S'estan generant les primeres pàgines per al mes <strong>" +
      mes +
      '</strong>, que està acabant. És correcte?',
    alertLabel: 'Alerta!',
    alertText: 'Aquesta pàgina no pertany a cap Col·legi de Farmacèutics',
    theme_dark: 'Fosc',
    theme_light: 'Clar',
    genTitle: 'Generant el document…',
    genClose: 'Tancar',
    genDownload: 'Obrir / Descarregar PDF',
    genErrGeneric: 'Hi ha hagut un error generant el document. Torna-ho a provar d’aquí una estona.',
    pages_fmt: (a: string, b: string, n: string) =>
      'Del full ' + a + ' al ' + b + ' <span class="dim">· ' + n + ' fulls</span>',
  },
  es: {
    docTitle: 'Farma-Kit - Rellenador de hojas de cupones',
    appTitle:
      'Rellenador de <span class="lo">hojas de cupones precinto</span><br>para la receta electrónica',
    intro:
      'Esta utilidad te permitirá rellenar de forma sencilla, rápida y económica la cabecera de las hojas de cupones precinto de tu farmacia. Solo se imprimirán los datos de la farmacia sobre las hojas oficiales de cupones, disponibles a través del mayorista.',
    chooseFirst: 'Elige tu Colegio de Farmacéuticos',
    gateHint: 'Selecciona un colegio con plantilla disponible para continuar.',
    cnLabel: 'Código nacional de las hojas',
    privacy: 'Los datos se procesan en tu ordenador y no se envían a ningún sitio',
    noCookies: 'No se usan cookies',
    instr: 'Instrucciones',
    step1: 'Pon en la impresora el número de papeles (hojas de cupones) que necesites imprimir.',
    step2:
      'Rellena el formulario siguiente. Para hacer una prueba pon el número <span class="kbd">1</span> en el campo <em>Número de hojas</em>.',
    step3: 'Genera el documento e imprímelo <em>sobre</em> las hojas de cupones.',
    oblig: 'Información general',
    obligSub: 'Para rellenar la cabecera de las hojas.',
    colegi: 'Colegio de Farmacéuticos',
    colegiPh: 'Selecciona tu colegio…',
    searchPh: 'Buscar…',
    reqBtn: 'Pedir',
    reqStatus: 'Aún no disponible',
    noTemplate:
      'Todavía no tenemos la plantilla de este colegio. Pídela y la añadiremos para que puedas usarla.',
    up: 'UP de la farmacia',
    mes: 'Mes y año',
    full: 'Hoja inicial',
    num: 'Cantidad de hojas',
    pages: 'Páginas a imprimir',
    dismiss: 'No mostrar más',
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
    contact: 'Contactar',
    generar: 'Generar Documento',
    errUp: 'Debe ser un número de 5 cifras.',
    errNat: 'Introduce un número entero mayor que 0.',
    errNif: 'NIF no válido.',
    errCp: 'Código postal no válido (5 cifras).',
    errRequired: 'Rellena este campo para generar el sello.',
    errColegi: 'Selecciona un colegio con plantilla disponible.',
    showAgain: 'Mostrar el aviso legal',
    continuar: 'Continuar',
    cancel: 'Cancelar',
    warnAhead: (mes: string) =>
      '¡Atención! Estás generando páginas adelantadas para el mes <strong>' +
      mes +
      '</strong>. ¿Es correcto?',
    warnCurrent: (mes: string) =>
      '¡Atención! Se están generando las primeras páginas para el mes <strong>' +
      mes +
      '</strong>, que está terminando. ¿Es correcto?',
    alertLabel: '¡Atención!',
    alertText: 'Esta página no pertenece a ningún Colegio de Farmacéuticos',
    theme_dark: 'Oscuro',
    theme_light: 'Claro',
    genTitle: 'Generando el documento…',
    genClose: 'Cerrar',
    genDownload: 'Abrir / Descargar PDF',
    genErrGeneric: 'Ha ocurrido un error generando el documento. Inténtalo de nuevo dentro de un rato.',
    pages_fmt: (a: string, b: string, n: string) =>
      'De la hoja ' + a + ' a la ' + b + ' <span class="dim">· ' + n + ' hojas</span>',
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
    if (typeof v === 'string') el.setAttribute('placeholder', v);
  });
}
