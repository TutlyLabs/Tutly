module.exports = {
  apps: [
    {
      name: "tutly-runner-orchestrator",
      script: "dist/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "2G",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
