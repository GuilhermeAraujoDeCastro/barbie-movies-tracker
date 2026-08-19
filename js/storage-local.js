// Persistencia do modo visitante: so' digita o nome, sem cadastro, e o
// progresso fica salvo no localStorage do navegador (nao sincroniza entre
// aparelhos, mas funciona na hora, sem depender do Firebase).

import { normalizeProgress, todayLocal } from './collection.js';
const IS_DEMO=new URLSearchParams(globalThis.location?.search||'').get('demo')==='1';
const KEY_PREFIX = "barbie-tracker:guest:v2:";
const LEGACY_PREFIX = "barbie-tracker:";
const LAST_GUEST_KEY = "barbie-tracker:last-guest";

function emptyProgress() {
  return normalizeProgress();
}

export function loadLocalProgress(profileName) {
  const key = KEY_PREFIX + encodeURIComponent(profileName);
  const raw = localStorage.getItem(key) ?? (IS_DEMO?null:localStorage.getItem(LEGACY_PREFIX + profileName));
  if (!raw) {
    return emptyProgress();
  }
  try {
    const parsed = JSON.parse(raw);
    const progress = normalizeProgress(parsed);
    localStorage.setItem(key, JSON.stringify(progress));
    return progress;
  } catch {
    return emptyProgress();
  }
}

export function saveLocalProgress(profileName, progress) {
  localStorage.setItem(KEY_PREFIX + encodeURIComponent(profileName), JSON.stringify(normalizeProgress(progress)));
}

export function toggleWatched(progress, movieId) {
  const watched = new Set(progress.watched);
  if (watched.has(movieId)) {
    watched.delete(movieId);
  } else {
    watched.add(movieId);
  }
  const watchedAt = {...progress.watchedAt};
  if(watched.has(movieId) && !watchedAt[movieId]) watchedAt[movieId]=todayLocal();
  return { ...progress, watched: [...watched], watchedAt };
}

export function setRating(progress, movieId, rating) {
  return { ...progress, ratings: { ...progress.ratings, [movieId]: rating } };
}

// text vazia ("") fica salva mesmo assim - e' o jeito de "apagar" a
// resenha sem tirar o filme da lista de assistidos.
export function setReview(progress, movieId, text) {
  return { ...progress, reviews: { ...progress.reviews, [movieId]: text } };
}

// Guarda so' o nome do ultimo visitante que entrou, pra reabrir a sessao
// dele sozinho na proxima visita (sem precisar digitar o nome de novo).
// O progresso em si continua em barbie-tracker:<nome>, isso aqui e so' um
// "lembrete" de qual nome usar.
export function loadLastGuestName() {
  return localStorage.getItem(LAST_GUEST_KEY);
}

export function saveLastGuestName(profileName) {
  localStorage.setItem(LAST_GUEST_KEY, profileName);
}

export function clearLastGuestName() {
  localStorage.removeItem(LAST_GUEST_KEY);
}
