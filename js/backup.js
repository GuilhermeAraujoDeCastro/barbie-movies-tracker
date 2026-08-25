// Exportar/importar o progresso como JSON - sobretudo pro modo visitante,
// que perde tudo se limpar o navegador. Funcao pura: nao mexe em arquivo
// nem em DOM, so' monta/valida o objeto.

import { validateReview } from "./reviews.js";
import { normalizeProgress } from './collection.js';

export function exportProgressPayload(profile, progress) {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    profileName: profile.name,
    progress: {
      watched: [...progress.watched],
      ratings: { ...progress.ratings },
      reviews: { ...progress.reviews },
      watchlist: {...progress.watchlist},
      watchedAt: {...progress.watchedAt},
    },
  };
}

// Devolve null em qualquer formato inesperado (JSON invalido, campo
// faltando, tipo errado) pra quem chamou decidir como avisar o usuario -
// mesmo padrao defensivo do resto do projeto (loadLocalProgress etc).
export function parseImportedProgress(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }

  const progress = parsed && typeof parsed === "object" ? parsed.progress : null;
  if (!progress || typeof progress !== "object") {
    return null;
  }
  if(Array.isArray(progress)||!Array.isArray(progress.watched)||!progress.ratings||Array.isArray(progress.ratings)||typeof progress.ratings!=='object'||(parsed.version!=null&&![1,2].includes(parsed.version)))return null;

  const watched = Array.isArray(progress.watched) ? progress.watched.filter((id) => typeof id === "number") : [];

  const ratings =
    progress.ratings && typeof progress.ratings === "object"
      ? Object.fromEntries(
          Object.entries(progress.ratings).filter(([, value]) => typeof value === "number" && value >= 1 && value <= 5),
        )
      : {};

  const reviews =
    progress.reviews && typeof progress.reviews === "object"
      ? Object.fromEntries(
          // Mesmo limite da tela (500 caracteres): JSON editado a mao nao entra com resenha gigante.
          Object.entries(progress.reviews)
            .map(([id, value]) => [id, validateReview(value)])
            .filter(([, value]) => typeof value === "string"),
        )
      : {};

  return normalizeProgress({ watched, ratings, reviews, watchlist: progress.watchlist, watchedAt: progress.watchedAt });
}

function csvCell(value) {
  let text=String(value??'');
  if(/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function exportCollectionCsv(movies,progress) {
  const rows=[['Título','Ano de lançamento','Assistido','Nota','Resenha','Data assistida','Prioridade quero assistir']];
  for(const m of movies)rows.push([m.title,m.year,progress.watched.includes(m.id)?'Sim':'Não',progress.ratings[m.id],progress.reviews[m.id],progress.watchedAt?.[m.id],progress.watchlist?.[m.id]]);
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
