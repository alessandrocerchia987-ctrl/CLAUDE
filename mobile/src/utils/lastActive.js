// "Ativo agora" / "Ativo há 3 dias" style label, so an employer can judge
// whether a candidate is still actually looking for work before paying to
// unlock their contact — the same freshness signal a live "last seen"
// would give, without hiding or deleting anything.
export function lastActiveLabel(iso) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 5) return 'Ativo agora';
  if (mins < 60) return `Ativo há ${mins} min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Ativo há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `Ativo há ${days} d`;

  const months = Math.floor(days / 30);
  if (months < 12) return `Ativo há ${months} ${months === 1 ? 'mês' : 'meses'}`;

  const years = Math.floor(months / 12);
  return `Ativo há ${years} ${years === 1 ? 'ano' : 'anos'}`;
}
