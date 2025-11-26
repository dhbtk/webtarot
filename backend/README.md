# webtarot-backend

## API

`POST /api/v1/reading`

Request body:

```json
{
  "question": "question to be answered",
  "cards": 6
 }
```

## Localization (i18n)

The backend uses `rust-i18n` with YAML locale files under `backend/locales`.

- Supported languages right now: `pt` (Portuguese, default) and `en` (English)
- The locale is chosen per-request by this priority:
  1. `X-Locale` header (e.g. `X-Locale: en`)
  2. `Accept-Language` header (e.g. `Accept-Language: en-US,en;q=0.9`)
  3. Fallback to `pt`

Adding or updating translations:

1. Add keys and messages in:
   - `backend/locales/pt.yml`
   - `backend/locales/en.yml`
2. Use the translation macro in code: `t!("errors.not_found")` or with variables `t!("errors.api_error", status = code, body = text)`

Example curl forcing English:

```
curl -H "X-Locale: en" \
     -H "X-User-UUID: <uuid>" \
     http://localhost:3000/api/v1/interpretation/<id>
```

The translation files currently include keys for error messages, e.g. `errors.not_found`, `errors.missing_openai_key`, etc.

Response body:

```json
{
  "shuffledTimes": 3092,
  "cards": [
    // ...
],
  "interpretationId": "uuid"
}
```

`GET /api/v1/interpretation/:id`

Response body (not ready yet):

```json
{
  "done": false,
  "error": "",
  "interpretation": ""
}
```

Response body (ready):

```json
{
  "done": true,
  "error": "",
  "interpretation": "interpretation text"
}
```

Response body (error):

```json
{
  "done": true,
  "error": "Error description",
  "interpretation": ""
}
```
