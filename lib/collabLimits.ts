/**
 * Project membership caps, shared between the browser (collabUtils) and the
 * server invite route. Lives in its own module because collabUtils imports the
 * client Firebase SDK, which must not be pulled into a server route.
 */

// Total project membership cap, owner included.
export const MAX_PROJECT_MEMBERS = 5;
export const MAX_COLLABORATORS = MAX_PROJECT_MEMBERS - 1; // 4, excludes owner
