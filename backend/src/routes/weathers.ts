import { express, type Request, type Response } from "../deps.ts";
import { createClient } from "../deps.ts";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config/env.ts";
import { authMiddleware } from "../middleware/auth.ts";
import { getWeekendForecast } from "../services/weather/openWeather.ts";

const router = express.Router();
router.use(authMiddleware);

router.get(
    "/:campsiteId",
    async (req: Request<{ campsiteId: string }>, res: Response) => {
        try {
            const authz = req.headers.authorization; // "Bearer <supabase_jwt>"
            if (!authz) {
                return res.status(401).json({ error: "Missing token" });
            };

            // Create a Supabase client that acts AS THIS USER
                const supabaseLoggedIn = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    auth: { persistSession: false, autoRefreshToken: false },
                    global: { headers: { Authorization: authz } }, // important key line
                });

            const { data, error } = await supabaseLoggedIn
                .from("campsites")
                .select("lat,lon")
                .eq("id", req.params.campsiteId)
                .single();

            if (error) {
                console.log(error)
                return res.status(404).json({ error: "Not found" });
            };
            const forecast = await getWeekendForecast(data.lat, data.lon);
            res.json(forecast);
        } catch (e) {
            console.error("weather GET failed:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
});

export const weatherRouter = router;
