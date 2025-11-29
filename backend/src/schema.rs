// @generated automatically by Diesel CLI.

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
    }
}
