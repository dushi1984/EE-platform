import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/* -------------------- Academic structure (teacher-managed) -------------------- */

export const academicLevels = pgTable("academic_levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const academicClasses = pgTable(
  "academic_classes",
  {
    id: serial("id").primaryKey(),
    levelId: integer("level_id")
      .notNull()
      .references(() => academicLevels.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameAr: text("name_ar").notNull().default(""),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("academic_classes_level_idx").on(t.levelId)],
);

export const academicTerms = pgTable("academic_terms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  color: text("color").notNull().default("indigo"),
  icon: text("icon").notNull().default("science"),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    parentPhone: text("parent_phone").notNull().default(""),
    studentCode: text("student_code").notNull(),
    passwordHash: text("password_hash").notNull(),
    qrToken: text("qr_token").notNull(),
    avatarUrl: text("avatar_url"),
    grade: text("grade").notNull().default("Grade 10"),
    classId: integer("class_id"),
    dateOfBirth: timestamp("date_of_birth", { mode: "date" }),
    parentName: text("parent_name").notNull().default(""),
    lastLoginAt: timestamp("last_login_at", { mode: "date" }),
    role: text("role").notNull().default("student"), // "student" | "teacher"
    sessionVersion: integer("session_version").notNull().default(0),
    notifyEmail: boolean("notify_email").notNull().default(true),
    notifySms: boolean("notify_sms").notNull().default(true),
    notifyTasks: boolean("notify_tasks").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_phone_idx").on(t.phone),
    uniqueIndex("users_student_code_idx").on(t.studentCode),
    uniqueIndex("users_qr_token_idx").on(t.qrToken),
  ],
);

export const materials = pgTable(
  "materials",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    titleAr: text("title_ar").notNull(),
    description: text("description").notNull().default(""),
    descriptionAr: text("description_ar").notNull().default(""),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    thumbnailUrl: text("thumbnail_url"),
    priceCents: integer("price_cents").notNull().default(0),
    isNew: boolean("is_new").notNull().default(false),
    published: boolean("published").notNull().default(true),
    kind: text("kind").notNull().default("video"), // "video" | "pdf" | "doc"
    termId: integer("term_id"),
    fileSize: text("file_size").notNull().default(""),
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    storageBucket: text("storage_bucket").notNull().default("files"),
    storagePath: text("storage_path"),
    mimeType: text("mime_type"),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("materials_slug_idx").on(t.slug), index("materials_subject_idx").on(t.subjectId)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: serial("id").primaryKey(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    titleAr: text("title_ar").notNull(),
    content: text("content").notNull().default(""),
    videoUrl: text("video_url"),
    position: integer("position").notNull().default(0),
    durationMinutes: integer("duration_minutes").notNull().default(10),
  },
  (t) => [index("lessons_material_idx").on(t.materialId)],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    questionAr: text("question_ar"),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation"),
  },
  (t) => [index("quiz_lesson_idx").on(t.lessonId)],
);

export const quizAttempts = pgTable("quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const purchases = pgTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    pricePaidCents: integer("price_paid_cents").notNull().default(0),
    paymentMethod: text("payment_method").notNull().default("card"), // instapay | card | wallet | free
    status: text("status").notNull().default("paid"), // paid | pending
    purchasedAt: timestamp("purchased_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("purchases_user_material_idx").on(t.userId, t.materialId)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    reference: text("reference").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    materialId: integer("material_id").references(() => materials.id, { onDelete: "set null" }),
    amountCents: integer("amount_cents").notNull(),
    method: text("method").notNull(), // card | instapay | wallet | free
    methodLabel: text("method_label").notNull().default(""),
    status: text("status").notNull().default("pending"), // pending | paid | failed
    failureReason: text("failure_reason"),
    gatewayRef: text("gateway_ref"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("payments_reference_idx").on(t.reference), index("payments_user_idx").on(t.userId)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("progress_user_lesson_idx").on(t.userId, t.lessonId)],
);

export const materialViews = pgTable(
  "material_views",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("views_user_material_idx").on(t.userId, t.materialId)],
);

export type TaskQuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    titleAr: text("title_ar").notNull(),
    description: text("description").notNull().default(""),
    descriptionAr: text("description_ar").notNull().default(""),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    taskType: text("task_type").notNull().default("assignment"), // assignment | quiz | homework | worksheet | lab
    attachmentName: text("attachment_name"),
    attachmentBody: text("attachment_body").notNull().default(""),
    attachmentUrl: text("attachment_url"),
    attachmentStoragePath: text("attachment_storage_path"),
    attachmentMime: text("attachment_mime"),
    quizQuestions: jsonb("quiz_questions").$type<TaskQuizQuestion[] | null>(),
    status: text("status").notNull().default("open"), // open | closed
    termId: integer("term_id"),
    targetGrade: text("target_grade").notNull().default("all"), // "all" or a grade name
    targetStudentId: integer("target_student_id").references(() => users.id, { onDelete: "cascade" }),
    maxScore: integer("max_score").notNull().default(100),
    dueDate: timestamp("due_date", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("tasks_due_idx").on(t.dueDate), index("tasks_target_student_idx").on(t.targetStudentId)],
);

export const taskProgress = pgTable(
  "task_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("todo"), // todo | in_progress | done | dismissed
    progress: integer("progress").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("task_progress_user_task_idx").on(t.userId, t.taskId)],
);

export const taskSubmissions = pgTable(
  "task_submissions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    note: text("note").notNull().default(""),
    fileData: text("file_data"),
    fileUrl: text("file_url"),
    fileStoragePath: text("file_storage_path"),
    fileMime: text("file_mime"),
    score: integer("score"),
    gradedAt: timestamp("graded_at", { mode: "date" }),
    submittedAt: timestamp("submitted_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("submissions_user_task_idx").on(t.userId, t.taskId)],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientType: text("recipient_type").notNull().default("student"), // student | parent
    body: text("body").notNull(),
    attachmentName: text("attachment_name"),
    attachmentData: text("attachment_data"),
    attachmentUrl: text("attachment_url"),
    attachmentStoragePath: text("attachment_storage_path"),
    attachmentMime: text("attachment_mime"),
    readAt: timestamp("read_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("messages_student_idx").on(t.studentId), index("messages_sender_idx").on(t.senderId)],
);

export type NotificationKind =
  | "task"
  | "quiz"
  | "grade"
  | "submission"
  | "message"
  | "material"
  | "payment"
  | "system";

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("system"),
    title: text("title").notNull(),
    titleAr: text("title_ar").notNull().default(""),
    body: text("body").notNull().default(""),
    bodyAr: text("body_ar").notNull().default(""),
    href: text("href").notNull().default("/dashboard"),
    readAt: timestamp("read_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const grades = pgTable(
  "grades",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    titleAr: text("title_ar").notNull().default(""),
    kind: text("kind").notNull().default("quiz"), // quiz | assignment | exam
    score: integer("score").notNull(),
    maxScore: integer("max_score").notNull(),
    gradedAt: timestamp("graded_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("grades_user_idx").on(t.userId)],
);

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // card | instapay | wallet
  label: text("label").notNull(),
  details: text("details").notNull().default(""),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/* -------------------- Relations -------------------- */

export const subjectsRelations = relations(subjects, ({ many }) => ({
  materials: many(materials),
  tasks: many(tasks),
  grades: many(grades),
}));

export const academicLevelsRelations = relations(academicLevels, ({ many }) => ({
  classes: many(academicClasses),
}));

export const academicClassesRelations = relations(academicClasses, ({ one }) => ({
  level: one(academicLevels, { fields: [academicClasses.levelId], references: [academicLevels.id] }),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  subject: one(subjects, { fields: [materials.subjectId], references: [subjects.id] }),
  lessons: many(lessons),
  purchases: many(purchases),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  material: one(materials, { fields: [lessons.materialId], references: [materials.id] }),
  questions: many(quizQuestions),
  progress: many(lessonProgress),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  lesson: one(lessons, { fields: [quizQuestions.lessonId], references: [lessons.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  subject: one(subjects, { fields: [tasks.subjectId], references: [subjects.id] }),
  targetStudent: one(users, { fields: [tasks.targetStudentId], references: [users.id] }),
  progress: many(taskProgress),
  submissions: many(taskSubmissions),
}));

export const taskSubmissionsRelations = relations(taskSubmissions, ({ one }) => ({
  user: one(users, { fields: [taskSubmissions.userId], references: [users.id] }),
  task: one(tasks, { fields: [taskSubmissions.taskId], references: [tasks.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "sentMessages" }),
  student: one(users, { fields: [messages.studentId], references: [users.id], relationName: "receivedMessages" }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  subject: one(subjects, { fields: [grades.subjectId], references: [subjects.id] }),
  user: one(users, { fields: [grades.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  purchases: many(purchases),
  payments: many(payments),
  grades: many(grades),
  paymentMethods: many(paymentMethods),
  notifications: many(notifications),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, { fields: [purchases.userId], references: [users.id] }),
  material: one(materials, { fields: [purchases.materialId], references: [materials.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  material: one(materials, { fields: [payments.materialId], references: [materials.id] }),
}));

export type User = typeof users.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type TaskStatus = "todo" | "in_progress" | "done";
export type PaymentMethod = "instapay" | "card" | "wallet" | "free";
export type TaskSubmission = typeof taskSubmissions.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AcademicLevel = typeof academicLevels.$inferSelect;
export type AcademicClass = typeof academicClasses.$inferSelect;
export type AcademicTerm = typeof academicTerms.$inferSelect;
