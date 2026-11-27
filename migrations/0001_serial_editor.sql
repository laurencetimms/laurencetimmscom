-- The serial editor (/editor/): the text of the serial, and the author's
-- marks on it. Text lives here rather than in the repo because the repo is
-- public and the serial is released a week at a time. See DECISIONS.md.

-- One row per block of the text: a paragraph ('p'), section heading ('h'),
-- scene break ('s') or jump between storylines ('j'). `id` is stable and is
-- what marks point at; `pos` orders the blocks and is a REAL so a block can
-- later be inserted between two others without renumbering.
CREATE TABLE IF NOT EXISTS blocks (
  id         TEXT PRIMARY KEY,
  pos        REAL NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('p', 'h', 's', 'j')),
  body       TEXT NOT NULL,          -- JSON: runs for 'p', text for 'h', null otherwise
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS blocks_pos ON blocks (pos);

-- One row per mark. id = `${block_id}:${kind}`, so a block has at most one
-- mark of each kind.
CREATE TABLE IF NOT EXISTS marks (
  id         TEXT PRIMARY KEY,
  block_id   TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('break', 'extra', 'type', 'note', 'hide')),
  note       TEXT NOT NULL DEFAULT '',
  title      TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS marks_block ON marks (block_id);

-- Small key/value settings. `text_version` changes whenever the text does,
-- so the editor knows when its cached copy is stale.
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
