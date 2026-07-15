/* Canonical list of pharmacist colegios (provincial), grouped by autonomous
 * community. Shared data: the editor tags each template with a colegio, and the
 * generator app maps colegio → templates/<slug>.json via this same list. */

export interface ColegioGroup {
  region: string;
  colegios: string[];
}

export const COLEGIOS: ColegioGroup[] = [
  { region: 'Andalucía', colegios: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'] },
  { region: 'Aragón', colegios: ['Huesca', 'Teruel', 'Zaragoza'] },
  { region: 'Canarias', colegios: ['Las Palmas', 'Santa Cruz de Tenerife'] },
  { region: 'Cantabria', colegios: ['Cantabria'] },
  { region: 'Castilla-La Mancha', colegios: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'] },
  {
    region: 'Castilla y León',
    colegios: ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
  },
  { region: 'Catalunya', colegios: ['Barcelona', 'Girona', 'Lleida', 'Tarragona'] },
  { region: 'Comunidad de Madrid', colegios: ['Madrid'] },
  { region: 'Comunidad Foral de Navarra', colegios: ['Navarra'] },
  { region: 'Comunitat Valenciana', colegios: ['Alicante', 'Castellón', 'Valencia'] },
  { region: 'Euskadi', colegios: ['Araba / Álava', 'Bizkaia', 'Gipuzkoa'] },
  { region: 'Extremadura', colegios: ['Badajoz', 'Cáceres'] },
  { region: 'Galicia', colegios: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'] },
  { region: 'Illes Balears', colegios: ['Illes Balears'] },
  { region: 'La Rioja', colegios: ['La Rioja'] },
  { region: 'Principado de Asturias', colegios: ['Asturias'] },
  { region: 'Región de Murcia', colegios: ['Murcia'] },
  { region: 'Ciudades autónomas', colegios: ['Ceuta', 'Melilla'] },
];
