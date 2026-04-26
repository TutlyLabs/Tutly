/**
 * Re-exports the shared access-control primitives so that the web and mobile
 * auth clients pass identical `ac` and `roles` configs to `adminClient(...)`.
 *
 * The plugin list itself stays in each app because Better Auth's
 * customSessionClient/inferAdditionalFields plugins infer types from the
 * caller's specific server auth instance (`typeof auth`).
 */
export { ac, ROLES, adminRole, instructorRole, mentorRole, studentRole } from "./permissions";
