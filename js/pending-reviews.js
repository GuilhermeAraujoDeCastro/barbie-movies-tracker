// Cada tarefa captura a sessão que a criou; cancelamento não descarta o
// rascunho já escrito no estado local pelo campo de texto.
export function createPendingReviews(save, delay=400) {
  const timers=new Map();
  return {
    schedule(session,id,text) {
      clearTimeout(timers.get(id));
      timers.set(id,setTimeout(()=>{timers.delete(id);save(session,id,text);},delay));
    },
    cancel(){for(const timer of timers.values())clearTimeout(timer);timers.clear();},
  };
}
