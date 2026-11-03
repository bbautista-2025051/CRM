import { prisma } from '../../config/prisma';

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
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { tasks: { some: { title: { contains: query.search, mode: 'insensitive' } } } },
              {
                tasks: {
                  some: {
                    assignee: {
                      name: { contains: query.search, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
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

  const data = projects.map((project) => {
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

    const projectCompleted = project.tasks.filter((task) => task.status === 'COMPLETED').length;

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
        pending: project.tasks.filter((task) => task.status === 'PENDING').length,
        inProgress: project.tasks.filter((task) => task.status === 'IN_PROGRESS').length,
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
        activeProjects: projects.filter((project) => project.status === 'ACTIVE').length,
        completedProjects: projects.filter((project) => project.status === 'COMPLETED').length,
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overallProgress: progressOf(completedTasks, totalTasks),
      },
    },
  };
};
