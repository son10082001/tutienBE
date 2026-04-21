module.exports = {
  apps: [
    {
      name: "tutien-be",
      script: "dist/server.js",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 84
      }
    }
  ]
};
