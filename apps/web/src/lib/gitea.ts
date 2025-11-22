import { env } from "process";

const GITEA_API_URL = env.GITEA_API_URL;
const GITEA_ADMIN_TOKEN = env.GITEA_ADMIN_TOKEN;

if (!GITEA_API_URL || !GITEA_ADMIN_TOKEN) {
  console.warn("GITEA_API_URL or GITEA_ADMIN_TOKEN is not set");
}

export const giteaClient = {
  async createRepo(
    owner: string,
    name: string,
    isPrivate = true,
    isTemplate = false,
  ) {
    // Determine if the owner is an Organization or a User to select the correct API endpoint.
    const isOrg = await this.checkOrgExists(owner);

    const url = isOrg
      ? `${GITEA_API_URL}/api/v1/orgs/${encodeURIComponent(owner)}/repos`
      : `${GITEA_API_URL}/api/v1/admin/users/${encodeURIComponent(owner)}/repos`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${GITEA_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        name,
        private: isPrivate,
        auto_init: true,
        template: isTemplate,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 409) return; // Repository already exists.
      console.error(
        `Failed to create repo ${owner}/${name}: ${response.status} ${error}`,
      );
      throw new Error(`Failed to create repository`);
    }

    return response.json();
  },

  async generateRepoFromTemplate(
    templateOwner: string,
    templateRepo: string,
    owner: string,
    name: string,
  ) {
    const response = await fetch(
      `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(templateOwner)}/${encodeURIComponent(templateRepo)}/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${GITEA_ADMIN_TOKEN}`,
        },
        body: JSON.stringify({
          owner,
          name,
          private: true,
          git_content: true,
          git_hooks: false,
          webhooks: false,
          topics: true,
          avatar: false,
          labels: true,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 409) return; // Repository already exists.
      console.error(
        `Failed to generate repo from template ${templateOwner}/${templateRepo} -> ${owner}/${name}: ${response.status} ${error}`,
      );
      throw new Error(`Failed to generate repository from template`);
    }

    return response.json();
  },

  async checkRepoExists(owner: string, name: string) {
    const response = await fetch(
      `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      {
        method: "GET",
        headers: {
          Authorization: `token ${GITEA_ADMIN_TOKEN}`,
        },
      },
    );

    return response.ok;
  },

  async checkOrgExists(org: string) {
    const response = await fetch(
      `${GITEA_API_URL}/api/v1/orgs/${encodeURIComponent(org)}`,
      {
        headers: { Authorization: `token ${GITEA_ADMIN_TOKEN}` },
      },
    );
    return response.ok;
  },

  async ensureOrgExists(org: string) {
    if (await this.checkOrgExists(org)) return;

    const response = await fetch(`${GITEA_API_URL}/api/v1/orgs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${GITEA_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        username: org,
        visibility: "private",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create org ${org}: ${response.status} ${error}`);
      throw new Error(`Failed to create organization`);
    }
  },

  async addUserToOrg(org: string, username: string) {
    // Gitea does not support adding users directly to Organizations.
    // Users must be added to a Team within the Organization.
    // First, check if a default team exists; if not, create one.

    const teamsResponse = await fetch(
      `${GITEA_API_URL}/api/v1/orgs/${encodeURIComponent(org)}/teams`,
      {
        headers: {
          Authorization: `token ${GITEA_ADMIN_TOKEN}`,
        },
      },
    );

    let teamId;
    if (teamsResponse.ok) {
      const teams = await teamsResponse.json();
      // Search for a team named "members" or default to the first available team.
      const defaultTeam =
        teams.find((t: any) => t.name === "members" || t.name === "Owners") ||
        teams[0];

      if (defaultTeam) {
        teamId = defaultTeam.id;
      }
    }

    // If no suitable team exists, create a default "members" team.
    if (!teamId) {
      const createTeamResponse = await fetch(
        `${GITEA_API_URL}/api/v1/orgs/${encodeURIComponent(org)}/teams`,
        {
          method: "POST",
          headers: {
            Authorization: `token ${GITEA_ADMIN_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "members",
            description: "Default members team",
            permission: "read", // read, write, or admin
            can_create_org_repo: false,
            includes_all_repositories: true,
          }),
        },
      );

      if (createTeamResponse.ok) {
        const team = await createTeamResponse.json();
        teamId = team.id;
      } else {
        const errorText = await createTeamResponse.text();
        console.error(
          `Failed to create team for org ${org}: ${createTeamResponse.status} ${errorText}`,
        );
        throw new Error(`Failed to create team`);
      }
    }

    // Add the user to the identified team.
    const addMemberResponse = await fetch(
      `${GITEA_API_URL}/api/v1/teams/${teamId}/members/${encodeURIComponent(username)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${GITEA_ADMIN_TOKEN}`,
        },
      },
    );

    if (!addMemberResponse.ok) {
      const errorText = await addMemberResponse.text();
      console.error(
        `Failed to add user ${username} to team ${teamId} in org ${org}: ${addMemberResponse.status} ${errorText}`,
      );
      throw new Error(`Failed to add user to organization`);
    }
  },

  async ensureUserExists(username: string, email: string) {
    // Check if the user already exists.
    const check = await fetch(
      `${GITEA_API_URL}/api/v1/users/${encodeURIComponent(username)}`,
      {
        headers: { Authorization: `token ${GITEA_ADMIN_TOKEN}` },
      },
    );

    if (check.ok) return;

    // Create the user if they do not exist. A random password is generated as it is not used for auth.
    const password = Math.random().toString(36).slice(-8) + "A1!";
    const create = await fetch(`${GITEA_API_URL}/api/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${GITEA_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        username,
        email,
        password,
        must_change_password: false,
      }),
    });

    if (!create.ok) {
      const err = await create.text();
      console.error(
        `Failed to create gitea user ${username}: ${create.status} ${err}`,
      );
      throw new Error(`Failed to create user`);
    }
  },

  async getContents(
    owner: string,
    repo: string,
    filepath: string = "",
    ref?: string,
  ) {
    let url = `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filepath.split("/").map(encodeURIComponent).join("/")}`;
    if (ref) {
      url += `?ref=${encodeURIComponent(ref)}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${GITEA_ADMIN_TOKEN}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.text();
      console.error(
        `Failed to get contents for ${owner}/${repo}/${filepath}: ${response.status} ${error}`,
      );
      throw new Error(`Failed to get contents`);
    }

    return response.json();
  },
};
