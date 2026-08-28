export const demoMovies=[
  {id:101,title:'Barbie em O Quebra-Nozes',year:2001,releaseDate:'2001-10-02',posterPath:null,genres:['Animação'],overview:'Catálogo fictício para experimentar a coleção sem serviços externos.'},
  {id:102,title:'Barbie como Rapunzel',year:2002,releaseDate:'2002-10-01',posterPath:null,genres:['Fantasia'],overview:'Use a ficha para experimentar prioridade, data e resenha.'},
  {id:103,title:'Barbie em O Lago dos Cisnes',year:2003,releaseDate:'2003-09-30',posterPath:null,genres:['Animação'],overview:'Os dados de progresso desta demonstração são fictícios.'},
];
export function addDemoReturnLink(){
  const raw=new URLSearchParams(location.search).get('returnTo');if(!raw)return;
  try{const url=new URL(raw,location.origin);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!['localhost','127.0.0.1','guilhermearaujodecastro.vercel.app'].includes(url.hostname))return;const a=document.createElement('a');a.href=url.href;a.textContent='Voltar ao estudo de caso';a.className='demo-return';document.querySelector('main').prepend(a);}catch{}
}
