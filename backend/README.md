# Backend

## Environment variables

The API loads configuration from the environment (or an `.env` file via
`src/config/env.ts`) and will refuse to start if any of the required
variables are missing. Define the following keys before running the server:

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Base URL for your Supabase project. |
| `SUPABASE_ANON_KEY` | Supabase anon key used to validate incoming client tokens. |
| `SUPABASE_SERVICE_ROLE` | Supabase service-role key used for privileged backend calls. |
| `JWT_SECRET` | Secret used to sign and verify server-issued JWTs. |
| `GEOAPIFY_KEY` | Geoapify API key for geocoding support. |
| `ACCUWEATHER_API_KEY` | AccuWeather Developer API key with access to the location, forecast, and alerts endpoints. |

You can store these values in a `.env` file and run the backend with
`deno task dev`, which automatically loads `.env`/`.env.dev`.
