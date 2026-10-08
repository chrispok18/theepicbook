"use strict";

const express = require("express");
const exphbs = require("express-handlebars");

// Requiring our models for syncing
const db = require("./models");

const PORT = process.env.PORT || 8080;

const app = express();

// Serve static content for the app from the "public" directory in the application directory.
app.use(express.static("public"));

// Parse application body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Request log: one JSON line per request. Logs the path only (no query string, headers, cookies or body).
app.use((req, res, next) => {
  if (req.path === "/health") return next(); // skip health probes to avoid noise
  const start = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({
      time: new Date().toISOString(),
      service: "backend",
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start
    }));
  });
  next();
});

// Health check: 200 only when the app is ready and the database answers, otherwise 503
app.get("/health", async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(503).json({ status: "unavailable", database: "unreachable" });
  }
});

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

require("./routes/cart-api-routes")(app);

console.log("going to html route");
app.use("/", require("./routes/html-routes"));
app.use("/cart", require("./routes/html-routes"));
app.use("/gallery", require("./routes/html-routes"));

db.sequelize.sync().then(function () {
  app.listen(PORT, function () {
    console.log("App listening on PORT " + PORT);
  });
});
