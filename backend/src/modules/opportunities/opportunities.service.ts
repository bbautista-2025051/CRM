import {
  Prisma,
  type Opportunity,
  type OpportunityStage,
  type User,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import {
  buildOrderBy,
  buildPaginationMeta,
  skipTake,
} from '../../utils/pagination';

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  stage?: OpportunityStage;
  status?: 'OPEN' | 'WON' | 'LOST';
  ownerId?: string;
  companyId?: string;
  clientId?: string;
  expectedCloseFrom?: string;
  expectedCloseTo?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

const SORTABLE = [
  'name',
  'value',
  'probability',
  'expectedCloseDate',
  'stage',
  'status',
  'createdAt',
  'updatedAt',
] as const;

const statusForStage = (
  stage: OpportunityStage,
): 'OPEN' | 'WON' | 'LOST' => {
  if (stage === 'GANADA') return 'WON';
  if (stage === 'PERDIDA') return 'LOST';
  return 'OPEN';
};

const datesForStage = (stage: OpportunityStage) => {
  if (stage === 'GANADA') return { wonAt: new Date(), lostAt: null };
  if (stage === 'PERDIDA') return { wonAt: null, lostAt: new Date() };
  return { wonAt: null, lostAt: null };
};

const validateRelations = async (
  companyId: string | null,
  clientId: string | null,
): Promise<{ companyId: string | null; clientId: string | null }> => {
  let resolvedCompanyId = companyId;

  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestError('La empresa seleccionada no existe');
    if (company.status === 'ARCHIVED') {
      throw new BadRequestError('No puedes asociar una oportunidad a una empresa archivada');
    }
  }

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new BadRequestError('El cliente seleccionado no existe');
    if (client.status === 'ARCHIVED') {
      throw new BadRequestError('No puedes asociar una oportunidad a un cliente archivado');
    }
    if (client.companyId) {
      if (resolvedCompanyId && client.companyId !== resolvedCompanyId) {
        throw new BadRequestError(
          'El cliente seleccionado pertenece a otra empresa. Revisa la asociación.',
        );
      }
      resolvedCompanyId = client.companyId;
    }
  }

  return { companyId: resolvedCompanyId, clientId };
};

const validateOwner = async (ownerId: string): Promise<void> => {
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) throw new BadRequestError('El responsable seleccionado no existe');
  if (owner.status !== 'ACTIVE') {
    throw new BadRequestError('El responsable seleccionado está desactivado');
  }
};

const assertCanManage = (opportunity: Opportunity, actor: User): void => {
  if (actor.role === 'ADMIN') return;
  if (opportunity.ownerId !== actor.id) {
    throw new ForbiddenError('Solo puedes gestionar las oportunidades que tienes asignadas');
  }
};

export const listOpportunities = async (params: ListParams) => {
  const where: Prisma.OpportunityWhereInput = {
    ...(params.stage ? { stage: params.stage } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(params.companyId ? { companyId: params.companyId } : {}),
    ...(params.clientId ? { clientId: params.clientId } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
            {
              company: {
                name: { contains: params.search, mode: 'insensitive' },
              },
            },
            {
              client: {
                OR: [
                  { firstName: { contains: params.search, mode: 'insensitive' } },
                  { lastName: { contains: params.search, mode: 'insensitive' } },
                ],
              },
            },
          ],
        }
      : {}),
    ...(params.expectedCloseFrom || params.expectedCloseTo
      ? {
          expectedCloseDate: {
            ...(params.expectedCloseFrom
              ? { gte: new Date(`${params.expectedCloseFrom}T00:00:00.000Z`) }
              : {}),
            ...(params.expectedCloseTo
              ? { lte: new Date(`${params.expectedCloseTo}T23:59:59.999Z`) }
              : {}),
          },
        }
      : {}),
  };

  const [total, opportunities] = await prisma.$transaction([
    prisma.opportunity.count({ where }),
    prisma.opportunity.findMany({
      where,
      orderBy: buildOrderBy(params.sortBy, SORTABLE, params.sortOrder, 'createdAt'),
      ...skipTake(params.page, params.pageSize),
      include: {
        company: { select: { id: true, name: true } },
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
        sale: { select: { id: true, saleNumber: true, status: true, amount: true } },
      },
    }),
  ]);

  return {
    data: opportunities,
    meta: buildPaginationMeta(total, params.page, params.pageSize),
  };
};

export const getOpportunity = async (id: string) => {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      company: true,
      client: true,
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      sale: true,
    },
  });
  if (!opportunity) throw new NotFoundError('La oportunidad no existe');
  return opportunity;
};

interface OpportunityInput {
  name: string;
  description: string | null;
  companyId: string | null;
  clientId: string | null;
  ownerId?: string;
  value: string;
  probability: number;
  expectedCloseDate: Date | null;
  stage: OpportunityStage;
}

export const createOpportunity = async (input: OpportunityInput, actor: User) => {
  const ownerId = input.ownerId ?? actor.id;

  if (actor.role !== 'ADMIN' && ownerId !== actor.id) {
    throw new ForbiddenError('Solo un administrador puede asignar oportunidades a otro responsable');
  }

  await validateOwner(ownerId);
  const relations = await validateRelations(input.companyId, input.clientId);

  const opportunity = await prisma.opportunity.create({
    data: {
      name: input.name,
      description: input.description,
      companyId: relations.companyId,
      clientId: relations.clientId,
      ownerId,
      value: input.value,
      probability: input.probability,
      expectedCloseDate: input.expectedCloseDate,
      stage: input.stage,
      status: statusForStage(input.stage),
      ...datesForStage(input.stage),
    },
    include: {
      company: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
      owner: { select: { id: true, name: true } },
    },
  });

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'OPPORTUNITY',
    entityId: opportunity.id,
    description: `Oportunidad creada: ${opportunity.name}`,
    metadata: { value: input.value, stage: input.stage },
  });

  return opportunity;
};

export const updateOpportunity = async (
  id: string,
  input: Partial<OpportunityInput>,
  actor: User,
) => {
  const existing = await prisma.opportunity.findUnique({
    where: { id },
    include: { sale: { select: { id: true, saleNumber: true } } },
  });
  if (!existing) throw new NotFoundError('La oportunidad no existe');

  assertCanManage(existing, actor);

  if (input.ownerId && input.ownerId !== existing.ownerId) {
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenError('Solo un administrador puede reasignar una oportunidad');
    }
    await validateOwner(input.ownerId);
  }

  const companyId =
    input.companyId !== undefined ? input.companyId : existing.companyId;
  const clientId = input.clientId !== undefined ? input.clientId : existing.clientId;
  const relations = await validateRelations(companyId, clientId);

  const nextStage = input.stage ?? existing.stage;
  if (existing.sale && nextStage !== 'GANADA') {
    throw new ConflictError(
      `La oportunidad tiene la venta ${existing.sale.saleNumber} asociada. Cancela la venta antes de cambiar la etapa.`,
    );
  }

  const stageChanged = input.stage !== undefined && input.stage !== existing.stage;

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
      ...(input.value !== undefined ? { value: input.value } : {}),
      ...(input.probability !== undefined ? { probability: input.probability } : {}),
      ...(input.expectedCloseDate !== undefined
        ? { expectedCloseDate: input.expectedCloseDate }
        : {}),
      companyId: relations.companyId,
      clientId: relations.clientId,
      ...(stageChanged
        ? {
            stage: nextStage,
            status: statusForStage(nextStage),
            ...datesForStage(nextStage),
          }
        : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
      owner: { select: { id: true, name: true } },
      sale: { select: { id: true, saleNumber: true, status: true } },
    },
  });

  await logActivity({
    userId: actor.id,
    action: stageChanged ? 'STAGE_CHANGE' : 'UPDATE',
    entityType: 'OPPORTUNITY',
    entityId: opportunity.id,
    description: stageChanged
      ? `Oportunidad ${opportunity.name}: etapa ${existing.stage} → ${nextStage}`
      : `Oportunidad actualizada: ${opportunity.name}`,
    metadata: stageChanged
      ? { from: existing.stage, to: nextStage }
      : undefined,
  });

  return opportunity;
};

export const deleteOpportunity = async (id: string, actor: User) => {
  const existing = await prisma.opportunity.findUnique({
    where: { id },
    include: { sale: { select: { saleNumber: true } } },
  });
  if (!existing) throw new NotFoundError('La oportunidad no existe');

  assertCanManage(existing, actor);

  if (existing.sale) {
    throw new ConflictError(
      `No puedes eliminar una oportunidad con la venta ${existing.sale.saleNumber} asociada.`,
    );
  }

  await prisma.opportunity.delete({ where: { id } });

  await logActivity({
    userId: actor.id,
    action: 'DELETE',
    entityType: 'OPPORTUNITY',
    entityId: id,
    description: `Oportunidad eliminada: ${existing.name}`,
    metadata: { stage: existing.stage, value: existing.value.toString() },
  });
};
