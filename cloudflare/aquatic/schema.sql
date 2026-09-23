PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  class_name TEXT NOT NULL,
  seat_number TEXT NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_name, seat_number)
);

CREATE TABLE IF NOT EXISTS student_devices (
  token_hash TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS observations (
  student_id TEXT NOT NULL,
  plant_id TEXT NOT NULL,
  answers_json TEXT NOT NULL DEFAULT '{}',
  not_found INTEGER NOT NULL DEFAULT 0 CHECK(not_found IN (0, 1)),
  completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
  photo_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id, plant_id),
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_summaries (
  student_id TEXT PRIMARY KEY,
  classification_json TEXT NOT NULL DEFAULT '{}',
  classification_reason TEXT NOT NULL DEFAULT '',
  reflection TEXT NOT NULL DEFAULT '',
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_students_class_seat ON students(class_name, CAST(seat_number AS INTEGER));
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_identity ON students(class_name, seat_number);
CREATE INDEX IF NOT EXISTS idx_observations_student ON observations(student_id);
CREATE INDEX IF NOT EXISTS idx_observations_photo ON observations(photo_key) WHERE photo_key IS NOT NULL;
