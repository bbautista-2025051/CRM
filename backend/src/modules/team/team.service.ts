import { type User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { logActivity } from '../../utils/activity';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';

interface TeamQuery {
  projectId?: string;
  status?: 'ACTIVE' | 'COMPLETED';
  search?: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
    status: string;
  };
}

const progressOf = (completed: number, total: number) =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

export const getTeamOverview = async (query: TeamQuery = {}) => {
  const projects = await prisma.project.findMany({
    where: {
      ...(query.projectId ? { id: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      manager: { select: { id: true, name: true, avatarUrl: true } },
      tasks: {
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
              status: true,
            },
          },
        },
      },
    },
  });

  const uniqueMembers = new Set<string>();
  let totalTasks = 0;
  let completedTasks = 0;
  let pendingTasks = 0;
  let inProgressTasks = 0;

  const term = query.search?.trim().toLowerCase() ?? '';

  const data = projects
    .filter((project) => {
      if (!term) return true;
      const nameMatch = project.name.toLowerCase().includes(term);
      const descMatch = (project.description ?? '').toLowerCase().includes(term);
      const memberMatch = project.tasks.some((task) =>
        task.title.toLowerCase().includes(term) ||
        task.assignee?.name.toLowerCase().includes(term) ||
        task.assignee?.email.toLowerCase().includes(term),
      );
      return nameMatch || descMatch || memberMatch;
    })
    .map((project) => {
      const members = new Map<
        string,
        {
          user: TaskRow['assignee'];
          tasks: Array<Omit<TaskRow, 'assignee'>>;
          pending: number;
          inProgress: number;
          completed: number;
        }
      >();

      for (const task of project.tasks as TaskRow[]) {
        totalTasks += 1;
        if (task.status === 'COMPLETED') completedTasks += 1;
        else if (task.status === 'IN_PROGRESS') inProgressTasks += 1;
        else pendingTasks += 1;

        uniqueMembers.add(task.assignee.id);
        const member = members.get(task.assignee.id) ?? {
          user: task.assignee,
          tasks: [],
          pending: 0,
          inProgress: 0,
          completed: 0,
        };

        if (task.status === 'COMPLETED') member.completed += 1;
        else if (task.status === 'IN_PROGRESS') member.inProgress += 1;
        else member.pending += 1;

        member.tasks.push({
          id: task.id,
          title: task.title,
          status: task.status,
          dueDate: task.dueDate,
        });
        members.set(task.assignee.id, member);
      }

      const projectCompleted = project.tasks.filter(
        (task) => task.status === 'COMPLETED',
      ).length;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        dueDate: project.dueDate,
        manager: project.manager,
        progress: progressOf(projectCompleted, project.tasks.length),
        taskCounts: {
          total: project.tasks.length,
          pending: project.tasks.filter(
            (task) => task.status === 'PENDING',
          ).length,
          inProgress: project.tasks.filter(
            (task) => task.status === 'IN_PROGRESS',
          ).length,
          completed: projectCompleted,
        },
        members: Array.from(members.values())
          .map((member) => {
            const total = member.tasks.length;
            return {
              user: member.user,
              tasks: member.tasks,
              taskCounts: {
                total,
                pending: member.pending,
                inProgress: member.inProgress,
                completed: member.completed,
              },
              progress: progressOf(member.completed, total),
            };
          })
          .sort((a, b) => b.taskCounts.total - a.taskCounts.total),
      };
    });

  return {
    data: {
      projects: data,
      summary: {
        members: uniqueMembers.size,
        projects: projects.length,
        activeProjects: projects.filter(
          (project) => project.status === 'ACTIVE',
        ).length,
        completedProjects: projects.filter(
          (project) => project.status === 'COMPLETED',
        ).length,
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overallProgress: progressOf(completedTasks, totalTasks),
      },
    },
  };
};

/**
 * Crea una tarea dentro de un proyecto. Solo ADMIN y OPERACIONES pueden hacerlo
 * (validado también por el middleware requireTeamTaskManager).
 */
export const createTask = async (
  projectId: string,
  input: {
    title: string;
    description?: string | null;
    assigneeId: string;
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    dueDate?: Date | null;
  },
  actor: User,
) => {
  if (!input.title || !input.assigneeId) {
    throw new BadRequestError('El título y el responsable son obligatorios');
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError('El proyecto no existe');

  const assignee = await prisma.user.findUnique({
    where: { id: input.assigneeId },
  });
  if (!assignee) throw new BadRequestError('El responsable seleccionado no existe');
  if (assignee.status !== 'ACTIVE') {
    throw new BadRequestError('El responsable seleccionado está inactivo');
  }

  const task = await prisma.projectTask.create({
    data: {
      projectId,
      title: input.title,
      description: input.description ?? null,
      assigneeId: input.assigneeId,
      status: input.status ?? 'PENDING',
      dueDate: input.dueDate ?? null,
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });

  await logActivity({
    userId: actor.id,
    action: 'CREATE',
    entityType: 'TASK',
    entityId: task.id,
    description: `Tarea creada: ${task.title} (${project.name})`,
    metadata: { projectId, assigneeId: input.assigneeId },
  });

  return task;
};

/**
 * Actualiza una tarea. ADMIN y OPERACIONES pueden editar cualquier campo.
 * El responsable asignado solo puede cambiar su propio estado.
 */
export const updateTask = async (
  projectId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string | null;
    assigneeId?: string;
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    dueDate?: Date | null;
  },
  actor: User,
) => {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!task || task.projectId !== projectId) {
    throw new NotFoundError('La tarea no existe en este proyecto');
  }

  const isManager = actor.role === 'ADMIN' || actor.role === 'OPERACIONES';
  const isAssignee = task.assigneeId === actor.id;

  if (!isManager && !isAssignee) {
    throw new ForbiddenError('No tienes permisos para editar esta tarea');
  }

  if (!isManager) {
    // El responsable solo puede cambiar el estado de su propia tarea
    const changedFields = Object.entries(input).filter(
      ([, value]) => value !== undefined,
    );
    if (
      changedFields.some(([field]) => field !== 'status')
    ) {
      throw new ForbiddenError('Solo puedes actualizar el estado de tu tarea');
    }
  }

  if (input.assigneeId) {
    const newAssignee = await prisma.user.findUnique({
      where: { id: input.assigneeId },
    });
    if (!newAssignee) throw new BadRequestError('El nuevo responsable no existe');
    if (newAssignee.status !== 'ACTIVE') {
      throw new BadRequestError('El nuevo responsable está inactivo');
    }
  }

  const updated = await prisma.projectTask.update({
    where: { id: taskId },
    data: input,
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true, role: true } },
    },
  });

  await logActivity({
    userId: actor.id,
    action: input.status ? 'STATUS_CHANGE' : 'UPDATE',
    entityType: 'TASK',
    entityId: task.id,
    description: `Tarea actualizada: ${updated.title} (${task.project.name})`,
    metadata: { projectId, status: updated.status },
  });

  return updated;
};

/**
 * Elimina una tarea. Solo ADMIN y OPERACIONES.
 */
export const deleteTask = async (
  projectId: string,
  taskId: string,
  actor: User,
) => {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!task || task.projectId !== projectId) {
    throw new NotFoundError('La tarea no existe en este proyecto');
  }

  await prisma.projectTask.delete({ where: { id: taskId } });

  await logActivity({
    userId: actor.id,
    action: 'DELETE',
    entityType: 'TASK',
    entityId: taskId,
    description: `Tarea eliminada: ${task.title} (${task.project.name})`,
    metadata: { projectId },
  });
};

/**
 * Obtiene el detalle de una tarea. Cualquier usuario autenticado puede verla,
 * pero solo si es ADMIN, OPERACIONES o el responsable asignado.
 */
export const getTaskDetail = async (taskId: string, actor: User) => {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          company: { select: { id: true, name: true } },
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          status: true,
        },
      },
    },
  });
  if (!task) throw new NotFoundError('La tarea no existe');

  const isManager = actor.role === 'ADMIN' || actor.role === 'OPERACIONES';
  const isAssignee = task.assigneeId === actor.id;

  if (!isManager && !isAssignee) {
    throw new ForbiddenError('No tienes permisos para ver esta tarea');
  }

  return task;
};
