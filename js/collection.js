// Modelo da coleção. Datas são dias civis, sem conversão de fuso.
export const MAP_FIELDS = ['ratings', 'reviews', 'watchlist', 'watchedAt'];
export function todayLocal(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function validDay(value, today = todayLocal()) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= '1900-01-01' && value <= today
    && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value;
}
export function normalizeProgress(value = {}) {
  const result = {watched: [], ratings: {}, reviews: {}, watchlist: {}, watchedAt: {}};
  const idOk = id => /^\d+$/.test(String(id)) && Number.isSafeInteger(Number(id)) && Number(id)>0;
  result.watched = [...new Set((Array.isArray(value.watched)?value.watched:[]).filter(idOk).map(Number))];
  for (const field of MAP_FIELDS) {
    const map = value[field];
    if (!map || Array.isArray(map) || typeof map !== 'object') continue;
    for (const [id, item] of Object.entries(map)) {
      if (!idOk(id)) continue;
      if (field === 'ratings' && Number.isInteger(item) && item>=1 && item<=5
        || field === 'reviews' && typeof item === 'string' && item.length<=500
        || field === 'watchlist' && Number.isInteger(item) && item>=1 && item<=3
        || field === 'watchedAt' && validDay(item)) result[field][id]=item;
    }
  }
  return result;
}
export function movieRecord(progress, id) {
  const p=normalizeProgress(progress);
  return {watched:p.watched.includes(Number(id)), rating:p.ratings[id]??null,
    review:p.reviews[id]??'', watchPriority:p.watchlist[id]??0, watchedAt:p.watchedAt[id]??null};
}
export function progressFromRecords(records) {
  const p=normalizeProgress();
  for (const {id, data} of records) {
    if (data.watched) p.watched.push(Number(id));
    if (data.rating!=null) p.ratings[id]=data.rating;
    if (data.review) p.reviews[id]=data.review;
    if (data.watchPriority) p.watchlist[id]=data.watchPriority;
    if (data.watchedAt) p.watchedAt[id]=data.watchedAt;
  }
  return normalizeProgress(p);
}
export function movieIds(p) {
  return [...new Set([...p.watched, ...MAP_FIELDS.flatMap(field=>Object.keys(p[field]||{}).map(Number))])];
}
// Apenas os campos alterados entram na transação. Um snapshot antigo nunca
// substitui os outros filmes ou campos gravados por outro aparelho.
export function changedMovies(before, after) {
  const patches={};
  for (const id of new Set([...movieIds(before),...movieIds(after)])) {
    const a=movieRecord(before,id), b=movieRecord(after,id), patch={};
    for (const field of Object.keys(b)) if(a[field]!==b[field]) patch[field]=b[field];
    if(Object.keys(patch).length) patches[id]=patch;
  }
  return patches;
}
export function setWatchPriority(progress,id,priority) {
  if(!Number.isInteger(priority)||priority<0||priority>3) throw new Error('Prioridade inválida.');
  const watchlist={...progress.watchlist};
  if(priority) watchlist[id]=priority;else delete watchlist[id];
  return {...progress,watchlist};
}
export function setWatchedDay(progress,id,day) {
  if(day && !validDay(day)) throw new Error('Informe uma data válida até hoje.');
  const watchedAt={...progress.watchedAt};if(day) watchedAt[id]=day;else delete watchedAt[id];
  return {...progress,watchedAt};
}
export function watchedByMonth(progress) {
  const counts={};for(const id of progress.watched){const day=progress.watchedAt?.[id];if(validDay(day))counts[day.slice(0,7)]=(counts[day.slice(0,7)]||0)+1;}
  return Object.fromEntries(Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)));
}
