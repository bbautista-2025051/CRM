import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

/**
 * Verifica tareas con fecha límite próxima o vencida que aún no se han
 * completado y crea notificaciones de recordatorio para su responsable.
 *
 * Se considera "próxima o vencida" cuando la dueDate es menor o igual a hoy
 * más dos días. Para no saturar al usuario, solo se crea un recordatorio por
 * tarea y responsable si no existe uno ya creado en los últimos 7 días.
 */
export const checkTaskReminders = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const twoDaysLater = new Date(today);
  twoDaysLater.setDate(today.getDate() + 2);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const tasks = await prisma.projectTask.findMany({
    where: {
      assigneeId: { not: null },
      status: { not: 'COMPLETED' },
      dueDate: { lte: twoDaysLater, gte: today },
    },
    include: {
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
  });

  const created: Array<{ id: string; recipientId: string; taskId: string }> = [];

  for (const task of tasks) {
    if (!task.assigneeId) continue;

    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        recipientId: task.assigneeId,
        taskId: task.id,
        title: { contains: 'Recordatorio' },
        createdAt: { gte: sevenDaysAgo },
      },
    });
    if (alreadyNotified) continue;

    const isOverdue = task.dueDate && task.dueDate < today;
    const dueLabel = task.dueDate
      ? task.dueDate.toISOString().slice(0, 10)
      : '';

    const notification = await prisma.notification.create({
      data: {
        recipientId: task.assigneeId,
        taskId: task.id,
        title: isOverdue
          ? `Tarea vencida: ${task.title}`
          : `Recordatorio: tarea próxima a vencer`,
        message: isOverdue
          ? `La tarea "${task.title}" del proyecto "${task.project.name}" venció el ${dueLabel} y aún no se ha completado.`
          : `La tarea "${task.title}" del proyecto "${task.project.name}" vence el ${dueLabel}. Termínala a tiempo.`,
      },
    });

    created.push({
      id: notification.id,
      recipientId: notification.recipientId,
      taskId: notification.taskId,
    });
  }

  return created;
};
