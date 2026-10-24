import {writeFileSync}from'node:fs';
writeFileSync(new URL('../js/config.js',import.meta.url),`// Dados fictícios; apenas emuladores locais.
export const FIREBASE_CONFIG={apiKey:'fake-api-key',authDomain:'demo-auditoria-tracker.firebaseapp.com',projectId:'demo-auditoria-tracker',appId:'demo-tracker'};
export const FIREBASE_EMULATOR={authPort:9199,firestorePort:8180};
export const LOCAL_FIXTURES=true;
export const TMDB_API_KEY='';export const TMDB_PROXY=false;
export const SENTRY_DSN='';export const VAPID_PUBLIC_KEY='';
`);
console.log('js/config.js preparado para demo-auditoria-tracker local.');
