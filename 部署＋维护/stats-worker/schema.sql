CREATE TABLE IF NOT EXISTS visitors (
  visitor_hash TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ratings (
  visitor_hash TEXT PRIMARY KEY,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ratings_score ON ratings(score);