import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { removeProjectFile } from '../../middlewares/upload';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import {
  buildOrderBy,
  buildPaginationMeta,
  skipTake,
  type PaginationMeta,
} from '../../utils/pagination';

interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'ACTIVE' | 'COMPLETED';
  companyId?: string;
  managerId?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

interface ProjectInput {
  name?: string;
  description?: string | null;
  phone?: string | null;
  companyId?: string | null;
  managerId?: string | null;
  status?: 'ACTIVE' | 'COMPLETED';
  startDate?: Date | null;
  dueDate?: Date | null;
}

interface TaskInput {
  title?: string;
  description?: string | null;
  assigneeId?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate?: Date | null;
}

const SORTABLE = ['name', 'status', 'startDate', 'dueDate', 'createdAt', 'updatedAt'] as const;

const taskCounts = (tasks: Array<{ status: string }>) => {
  const counts = {
    total: tasks.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
  };
  for (const task of tasks) {
    if (task.status === 'COMPLETED') counts.completed += 1;
    else if (task.status === 'IN_PROGRESS') counts.inProgress += 1;
    else counts.pending += 1;
  }
  return {
    ...counts,
    progress: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
  };
};

const validateDates = (startDate?: Date | null, dueDate?: Date | null) => {
  if (startDate && dueDate && startDate.getTime() > dueDate.getTime()) {
    throw new BadRequestError('La fecha de entrega no puede ser anterior a la fecha de inicio');
  }
};

const validateRelations = async (input: ProjectInput) => {
  if (input.companyId) {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    if (!company) throw new BadRequestError('La empresa seleccionada no existe');
  }
  if (input.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: input.managerId } });
    if (!manager) throw new BadRequestError('El responsable seleccionado no existe');
  }
};

const validateAssignee = async (assigneeId: string) => {
  const user = await prisma.user.findUnique({ where: { id: assigneeId } });
  if (!user) throw new BadRequestError('El integrante seleccionado no existe');
  if (user.status !== 'ACTIVE') {
    throw new BadRequestError('El integrante seleccionado está inactivo');
  }
};

export const listProjects = async (params: ListParams) => {
  const where: Prisma.ProjectWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.companyId ? { companyId: params.companyId } : {}),
    ...(params.managerId ? { managerId: params.managerId } : {}),
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
            { company: { name: { contains: params.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, projects, activeCount, completedCount] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: buildOrderBy(params.sortBy, SORTABLE, params.sortOrder, 'updatedAt'),
      ...skipTake(params.page, params.pageSize),
      include: {
        company: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, avatarUrl: true } },
        tasks: { select: { status: true } },
      },
    }),
    prisma.project.count({ where: { status: 'ACTIVE' } }),
    prisma.project.count({ where: { status: 'COMPLETED' } }),
  ]);

  const counts = {
    ACTIVE: activeCount,
    COMPLETED: completedCount,
    total: activeCount + completedCount,
  };

  const data = projects.map(({ tasks, ...project }) => ({
    ...project,
    taskCounts: taskCounts(tasks),
  }));

  return {
    data,
    meta: buildPaginationMeta(total, params.page, params.pageSize) as PaginationMeta,
    counts,
  };
};

export const getProject = async (id: string) => {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true, avatarUrl: true } },
      tasks: {
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatarUrl: true, role: true },
          },
        },
      },
    },
  });

  if (!project) throw new NotFoundError('El proyecto no existe');
  return { ...project, taskCounts: taskCounts(project.tasks) };
};

export const createProject = async (input: ProjectInput, actor: User) => {
  if (!input.name) throw new BadRequestError('El nombre es obligatorio');
  validateDates(input.startDate, input.dueDate);
  await validateRelations(input);

  const status = input.status ?? 'ACTIVE';
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      phone: input.phone ?? null,
      companyId: input.companyId ?? null,
      managerId: input.managerId ?? null,
      status,
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  });

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'PROJECT',
    entityId: project.id,
    description: `Proyecto creado: ${project.name}`,
  });

  return getProject(project.id);
};

export const updateProject = async (id: string, input: ProjectInput, actor: User) => {
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('El proyecto no existe');

  validateDates(
    input.startDate !== undefined ? input.startDate : existing.startDate,
    input.dueDate !== undefined ? input.dueDate : existing.dueDate,
  );
  await validateRelations(input);

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...input,
      ...(input.status
        ? { completedAt: input.status === 'COMPLETED' ? existing.completedAt ?? new Date() : null }
        : {}),
    },
  });

  await logActivity({
    userId: actor.id,
    action: 'UPDATE',
    entityType: 'PROJECT',
    entityId: project.id,
    description: `Proyecto actualizado: ${project.name}`,
  });

  return getProject(project.id);
};

export const deleteProject = async (id: string, actor: User) => {
  const existing = await prisma.project.findUnique({
    where: { id },
    include: { _count: { select: { tasks: true } }, files: true },
  });
  if (!existing) throw new NotFoundError('El proyecto no existe');

  await prisma.project.delete({ where: { id } });

  for (const file of existing.files) {
    removeProjectFile(file.storedName);
  }

  await logActivity({
    userId: actor.id,
    action: 'DELETE',
    entityType: 'PROJECT',
    entityId: id,
    description: `Proyecto eliminado: ${existing.name}`,
    metadata: { tasks: existing._count.tasks },
  });
};

export const createTask = async (
  projectId: string,
  input: TaskInput,
  actor: User,
) => {
  if (!input.title || !input.assigneeId) {
    throw new BadRequestError('El título y el responsable son obligatorios');
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError('El proyecto no existe');
  await validateAssignee(input.assigneeId);

  const task = await prisma.projectTask.create({
    data: {
      projectId,
      title: input.title,
      description: input.description ?? null,
      assigneeId: input.assigneeId,
      status: input.status ?? 'PENDING',
      dueDate: input.dueDate ?? null,
    },
    include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
  });

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'TASK',
    entityId: task.id,
    description: `Tarea creada: ${task.title} (${project.name})`,
    metadata: { projectId },
  });

  return task;
};

const findTask = async (projectId: string, taskId: string) => {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!task || task.projectId !== projectId) {
    throw new NotFoundError('La tarea no existe en este proyecto');
  }
  return task;
};

export const updateTask = async (
  projectId: string,
  taskId: string,
  input: TaskInput,
  actor: User,
) => {
  const existing = await findTask(projectId, taskId);
  if (input.assigneeId) await validateAssignee(input.assigneeId);

  const task = await prisma.projectTask.update({
    where: { id: taskId },
    data: input,
    include: {
      assignee: {
        select: { id: true, name: true, email: true, avatarUrl: true, role: true },
      },
    },
  });

  await logActivity({
    userId: actor.id,
    action: input.status ? 'STATUS_CHANGE' : 'UPDATE',
    entityType: 'TASK',
    entityId: task.id,
    description: `Tarea actualizada: ${task.title} (${existing.project.name})`,
    metadata: { projectId, status: task.status },
  });

  return task;
};

export const deleteTask = async (projectId: string, taskId: string, actor: User) => {
  const existing = await findTask(projectId, taskId);
  await prisma.projectTask.delete({ where: { id: taskId } });

  await logActivity({
    userId: actor.id,
    action: 'DELETE',
    entityType: 'TASK',
    entityId: taskId,
    description: `Tarea eliminada: ${existing.title} (${existing.project.name})`,
    metadata: { projectId },
  });
};

// ---------------------------------------------------------------------------
// Archivos del proyecto
// ---------------------------------------------------------------------------

export const listProjectFiles = async (projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError('El proyecto no existe');

  return prisma.projectFile.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
};

export const uploadProjectFile = async (
  projectId: string,
  file: { originalName: string; storedName: string; mimeType: string; size: number },
  actor: User,
) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    removeProjectFile(file.storedName);
    throw new NotFoundError('El proyecto no existe');
  }

  const created = await prisma.projectFile.create({
    data: {
      projectId,
      originalName: file.originalName,
      storedName: file.storedName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size,
      uploadedById: actor.id,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  await logActivity({
    userId: actor.id,
    action: 'UPLOAD',
    entityType: 'PROJECT',
    entityId: projectId,
    description: `Archivo subido al proyecto ${project.name}: ${created.originalName}`,
    metadata: { fileId: created.id, storedName: created.storedName },
  });

  return created;
};

export const deleteProjectFile = async (
  projectId: string,
  fileId: string,
  actor: User,
) => {
  const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
  if (!file || file.projectId !== projectId) {
    throw new NotFoundError('El archivo no existe en este proyecto');
  }

  const isOwner = file.uploadedById === actor.id;
  if (actor.role !== 'ADMIN' && !isOwner) {
    throw new ForbiddenError('Solo puedes eliminar los archivos que subiste tú');
  }

  await prisma.projectFile.delete({ where: { id: fileId } });
  removeProjectFile(file.storedName);

  await logActivity({
    userId: actor.id,
    action: 'DELETE',
    entityType: 'PROJECT',
    entityId: projectId,
    description: `Archivo eliminado del proyecto: ${file.originalName}`,
    metadata: { fileId },
  });
};
