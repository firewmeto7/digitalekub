export type ServiceHealth = {
  status: "ok" | "degraded";
  checkedAt: string;
  dependencies: {
    database: "ok" | "error";
    redis: "ok" | "error";
  };
};