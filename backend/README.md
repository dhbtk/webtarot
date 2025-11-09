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
