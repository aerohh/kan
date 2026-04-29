-- Data Migration: Convert lists → "Status" group + options, labels → "Tags" group + options
-- Must run AFTER the schema migration creating property_group, property_option, _card_properties

CREATE OR REPLACE FUNCTION pg_temp.generate_prop_id() RETURNS varchar(12) AS $$
BEGIN
  RETURN substring(md5(random()::text || clock_timestamp()::text), 1, 12);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Step 1: "Status" groups - one per board that has non-deleted lists
-- ============================================================
INSERT INTO property_group (publicId, name, type, index, boardId, "createdBy", "createdAt")
SELECT
  pg_temp.generate_prop_id(),
  'Status',
  'single-select',
  0,
  sub.board_id,
  sub.first_creator,
  NOW()
FROM (
  SELECT l."boardId" AS board_id, MIN(l."createdBy") AS first_creator
  FROM list l
  WHERE l."deletedAt" IS NULL
  GROUP BY l."boardId"
) sub;

-- ============================================================
-- Step 2: "Tags" groups - one per board that has non-deleted labels
-- ============================================================
INSERT INTO property_group (publicId, name, type, index, boardId, "createdBy", "createdAt")
SELECT
  pg_temp.generate_prop_id(),
  'Tags',
  'multi-select',
  1,
  sub.board_id,
  sub.first_creator,
  NOW()
FROM (
  SELECT lb."boardId" AS board_id, MIN(lb."createdBy") AS first_creator
  FROM label lb
  WHERE lb."deletedAt" IS NULL
  GROUP BY lb."boardId"
) sub;

-- ============================================================
-- Step 3: Property options from lists (under "Status" group)
-- ============================================================
INSERT INTO property_option (publicId, name, colourCode, index, groupId, boardId, "createdBy", "createdAt")
SELECT
  pg_temp.generate_prop_id(),
  l.name,
  NULL,
  l.index,
  pg.id,
  l."boardId",
  l."createdBy",
  NOW()
FROM list l
INNER JOIN property_group pg
  ON pg."boardId" = l."boardId" AND pg.name = 'Status'
WHERE l."deletedAt" IS NULL;

-- ============================================================
-- Step 4: Property options from labels (under "Tags" group)
-- ============================================================
INSERT INTO property_option (publicId, name, colourCode, index, groupId, boardId, "createdBy", "createdAt")
SELECT
  pg_temp.generate_prop_id(),
  lb.name,
  lb."colourCode",
  ROW_NUMBER() OVER (PARTITION BY lb."boardId" ORDER BY lb.id) - 1,
  pg.id,
  lb."boardId",
  lb."createdBy",
  NOW()
FROM label lb
INNER JOIN property_group pg
  ON pg."boardId" = lb."boardId" AND pg.name = 'Tags'
WHERE lb."deletedAt" IS NULL;

-- ============================================================
-- Step 5: Link cards to Status options (from their list)
-- Match on name + index to handle boards with duplicate list names
-- ============================================================
INSERT INTO _card_properties (cardId, optionId)
SELECT c.id, po.id
FROM card c
INNER JOIN list l ON l.id = c."listId"
INNER JOIN property_group pg
  ON pg."boardId" = l."boardId" AND pg.name = 'Status'
INNER JOIN property_option po
  ON po."groupId" = pg.id
  AND po.name = l.name
  AND po.index = l.index
  AND po."boardId" = l."boardId"
WHERE c."deletedAt" IS NULL;

-- ============================================================
-- Step 6: Link cards to Tags options (from their labels)
-- ============================================================
INSERT INTO _card_properties (cardId, optionId)
SELECT cl."cardId", po.id
FROM _card_labels cl
INNER JOIN label lb ON lb.id = cl."labelId"
INNER JOIN property_group pg
  ON pg."boardId" = lb."boardId" AND pg.name = 'Tags'
INNER JOIN property_option po
  ON po."groupId" = pg.id
  AND po.name = lb.name
  AND po."boardId" = lb."boardId"
WHERE lb."deletedAt" IS NULL;

-- ============================================================
-- Step 7: Renumber card indices to be board-global
-- Currently per-list; reorder by (list index, card index) within each board
-- ============================================================
WITH board_card_order AS (
  SELECT
    c.id AS card_id,
    b.id AS board_id,
    ROW_NUMBER() OVER (
      PARTITION BY b.id
      ORDER BY l.index, c.index
    ) - 1 AS new_index
  FROM card c
  INNER JOIN list l ON l.id = c."listId"
  INNER JOIN board b ON b.id = l."boardId"
  WHERE c."deletedAt" IS NULL
)
UPDATE card
SET index = bco.new_index
FROM board_card_order bco
WHERE card.id = bco.card_id;

-- Drop temp function
DROP FUNCTION pg_temp.generate_prop_id();
