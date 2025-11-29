CREATE TABLE readings
(
    id                    uuid PRIMARY KEY,
    created_at            timestamp NOT NULL DEFAULT now(),
    question              text      NOT NULL DEFAULT '',
    context               text      NOT NULL DEFAULT '',
    cards                 jsonb     NOT NULL DEFAULT '[]'::jsonb,
    shuffled_times        int       NOT NULL DEFAULT 0,
    user_id               uuid      NOT NULL,
    user_name             text      NOT NULL DEFAULT '',
    user_self_description text      NOT NULL DEFAULT '',
    interpretation_status text      NOT NULL,
    interpretation_text   text      NOT NULL DEFAULT '',
    interpretation_error  text      NOT NULL DEFAULT '',
    deleted_at            timestamp
);

CREATE INDEX readings_user_id_idx ON readings (user_id);
