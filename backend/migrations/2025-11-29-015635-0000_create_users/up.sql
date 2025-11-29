CREATE TABLE users
(
    id               uuid PRIMARY KEY,
    created_at       timestamp NOT NULL DEFAULT now(),
    updated_at       timestamp NOT NULL DEFAULT now(),
    email            text      NOT NULL UNIQUE,
    password_digest  text      NOT NULL,
    name             text      NOT NULL DEFAULT '',
    self_description text      NOT NULL DEFAULT ''
);

CREATE INDEX users_email_idx ON users (email);

CREATE TABLE access_tokens
(
    id              bigserial PRIMARY KEY,
    user_id         uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    created_at      timestamp                                    NOT NULL DEFAULT now(),
    token           text                                         NOT NULL UNIQUE,
    last_user_ip    text                                         NOT NULL,
    last_user_agent text                                         NOT NULL,
    deleted_at      timestamp
);

CREATE INDEX access_tokens_user_id_idx ON access_tokens (user_id);
CREATE INDEX access_tokens_token_idx ON access_tokens (token);
