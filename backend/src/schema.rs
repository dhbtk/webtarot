// @generated automatically by Diesel CLI.

diesel::table! {
    access_tokens (id) {
        id -> Int8,
        user_id -> Uuid,
        created_at -> Timestamp,
        token -> Text,
        last_user_ip -> Text,
        last_user_agent -> Text,
        deleted_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    readings (id) {
        id -> Uuid,
        created_at -> Timestamp,
        question -> Text,
        context -> Text,
        cards -> Jsonb,
        shuffled_times -> Int4,
        user_id -> Uuid,
        user_name -> Text,
        user_self_description -> Text,
        interpretation_status -> Text,
        interpretation_text -> Text,
        interpretation_error -> Text,
        deleted_at -> Nullable<Timestamp>,
        interpretation_done_at -> Nullable<Timestamp>,
    }
}

diesel::table! {
    users (id) {
        id -> Uuid,
        created_at -> Timestamp,
        updated_at -> Timestamp,
        email -> Text,
        password_digest -> Text,
        name -> Text,
        self_description -> Text,
    }
}

diesel::joinable!(access_tokens -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(access_tokens, readings, users,);
