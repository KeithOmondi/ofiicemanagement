export type MemberCode = "RHC" | "AO" | "SM" | "PN" | "RA" | "BS";
export type Priority = "urgent" | "high" | "normal" | "low";
export type TaskStatus = "todo" | "inprogress" | "done" | "overdue" | "pending_approval";

export interface Member {
  name: string;
  role: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  desc: string;
  assignee: MemberCode | "GROUP";
  priority: Priority;
  deadline: string;
  status: TaskStatus;
  progress: number;
}

export interface Project {
  id: string;
  title: string;
  desc: string;
  deadline: string;
  priority: Priority;
  members: MemberCode[];
  collapsed: boolean;
  tasks: Task[];
}

export interface StandaloneTask {
  id: string;
  title: string;
  assignee: MemberCode;
  priority: Priority;
  deadline: string;
  status: TaskStatus;
  desc: string;
}