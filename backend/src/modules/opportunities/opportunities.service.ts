  if (actor.role !== 'ADMIN' && actor.role !== 'GERENTE' && opportunity.ownerId !== actor.id) {
    throw new ForbiddenError('Solo puedes gestionar las oportunidades que tienes asignadas');
  }
