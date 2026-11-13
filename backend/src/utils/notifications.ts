import type { Prisma } from '@prisma/client';

export const createTaskAssignmentNotification = (
  tx: Prisma.TransactionClient,
  input: {
    recipientId: string;
    taskId: string;
    taskTitle: string;
    projectName: string;
  },
) =>
  tx.notification.create({
    data: {
      recipientId: input.recipientId,
      taskId: input.taskId,
      title: 'Te asignaron una tarea',
      message: `Se te asignó "${input.taskTitle}" en el proyecto "${input.projectName}".`,
    },
  });
