import { Prisma, type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import { readProjectFile, removeProjectFile } from '../../middlewares/upload';
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
  amount?: string | null;
  preSales?: string | null;
  solution?: string | null;
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

/**
 * Campos públicos de un archivo de proyecto. Excluye deliberadamente `data`
 * (el binario) para no enviarlo en los listados JSON.
 */
const projectFileSelect = {
  id: true,
  projectId: true,
  commentId: true,
  originalName: true,
  storedName: true,
  mimeType: true,
  size: true,
  uploadedById: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true, avatarUrl: true } },
} satisfies Prisma.ProjectFileSelect;

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

/**
 * Asigna el número correlativo del proyecto (PRJ-001, PRJ-002, …).
 */
const nextProjectNumber = async (): Promise<number> => {
  const last = await prisma.project.findFirst({
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
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
  const number = await nextProjectNumber();
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      phone: input.phone ?? null,
      companyId: input.companyId ?? null,
      managerId: input.managerId ?? null,
      status,
      number,
      amount: input.amount ?? null,
      preSales: input.preSales ?? null,
      solution: input.solution ?? null,
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
    include: { _count: { select: { tasks: true } }, files: { select: { storedName: true } } },
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
// Comentarios del proyecto
// ---------------------------------------------------------------------------

export const listProjectComments = async (projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError('El proyecto no existe');

  return prisma.projectComment.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: projectFileSelect },
    },
  });
};

export const createProjectComment = async (
  projectId: string,
  body: string,
  fileIds: string[],
  actor: User,
) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError('El proyecto no existe');

  const comment = await prisma.projectComment.create({
    data: {
      projectId,
      authorId: actor.id,
      body,
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (fileIds.length) {
    await prisma.projectFile.updateMany({
      where: { projectId, commentId: null, id: { in: fileIds } },
      data: { commentId: comment.id },
    });
  }

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'PROJECT',
    entityId: projectId,
    description: `Comentario agregado al proyecto: ${project.name}`,
    metadata: { commentId: comment.id, attachments: fileIds.length },
  });

  return getProjectComment(comment.id);
};

const getProjectComment = (id: string) =>
  prisma.projectComment.findUniqueOrThrow({
    where: { id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      files: { select: projectFileSelect },
    },
  });

// ---------------------------------------------------------------------------
// Archivos del proyecto
// ---------------------------------------------------------------------------

export const listProjectFiles = async (projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError('El proyecto no existe');

  return prisma.projectFile.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: projectFileSelect,
  });
};

export const uploadProjectFile = async (
  projectId: string,
  file: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    data: Buffer;
  },
  actor: User,
) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    throw new NotFoundError('El proyecto no existe');
  }

  const created = await prisma.projectFile.create({
    data: {
      projectId,
      originalName: file.originalName,
      storedName: file.storedName,
      mimeType: file.mimeType || 'application/octet-stream',
      size: file.size,
      data: new Uint8Array(file.data),
      uploadedById: actor.id,
    },
    select: projectFileSelect,
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

/**
 * Recupera el contenido de un archivo para descargarlo. Prioriza el binario
 * guardado en la base de datos y, si es un registro antiguo sin `data`, intenta
 * leerlo del disco.
 */
export const getProjectFileForDownload = async (projectId: string, fileId: string) => {
  const file = await prisma.projectFile.findFirst({
    where: { id: fileId, projectId },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      storedName: true,
      data: true,
    },
  });
  if (!file) {
    throw new NotFoundError('El archivo no existe en este proyecto');
  }

  const data = file.data ?? (await readProjectFile(file.storedName));
  if (!data) {
    throw new NotFoundError(
      'Este archivo se subió antes de habilitar el almacenamiento en la base de datos y ya no está disponible. Vuelve a subirlo.',
    );
  }

  return { ...file, data };
};

export const deleteProjectFile = async (
  projectId: string,
  fileId: string,
  actor: User,
) => {
  const file = await prisma.projectFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      projectId: true,
      uploadedById: true,
      storedName: true,
      originalName: true,
    },
  });
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
