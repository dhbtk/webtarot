ALTER TABLE readings
    ADD COLUMN interpretation_done_at timestamp;
UPDATE readings
SET interpretation_done_at = created_at
WHERE interpretation_done_at IS NULL;
