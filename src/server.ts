import { env } from "./config/env.js";
import { app } from "./app.js";

app.listen(env.PORT, () => {
  console.log(`tutien-be is running at http://localhost:${env.PORT}`);
});
