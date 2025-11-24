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

  async getArchive(owner: string, repo: string, ref: string) {
    const url = `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/archive/${encodeURIComponent(ref)}.zip`;

    const response = await fetch(url, {
      headers: {
        Authorization: `token ${GITEA_ADMIN_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(
        `Failed to get archive for ${owner}/${repo}: ${response.status} ${error}`,
      );
      throw new Error(`Failed to get archive`);
    }

    return response.arrayBuffer();
  },

  async createCommit(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    files: Array<{ path: string; content: string; status: 'modified' | 'added' | 'deleted' }>,
    author?: { name: string; email: string }
  ) {
    // Strategy: Create a temporary branch, push all changes there, then squash merge to main
    const tempBranchName = `temp-commit-${Date.now()}`;

    try {
      // Step 1: Get the current branch's latest commit SHA
      const branchUrl = `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`;
      const branchResponse = await fetch(branchUrl, {
        headers: {
          Authorization: `token ${GITEA_ADMIN_TOKEN}`,
        },
      });

      if (!branchResponse.ok) {
        throw new Error('Failed to get branch info');
      }

      const branchData = await branchResponse.json();
      const baseSha = branchData.commit.id;

      // Step 2: Create a temporary branch from the current branch
      const createBranchUrl = `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`;
      const createBranchResponse = await fetch(createBranchUrl, {
        method: 'POST',
        headers: {
          Authorization: `token ${GITEA_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_branch_name: tempBranchName,
          old_ref_name: branch,
        }),
      });

      if (!createBranchResponse.ok) {
        throw new Error('Failed to create temporary branch');
      }

      // Step 3: Push all file changes to the temporary branch
      const results = [];
      for (const file of files) {
        try {
          const url = `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(file.path)}`;

          if (file.status === 'deleted') {
            // Get file SHA first
            const getResponse = await fetch(`${url}?ref=${tempBranchName}`, {
              headers: {
                Authorization: `token ${GITEA_ADMIN_TOKEN}`,
              },
            });

            if (getResponse.ok) {
              const fileData = await getResponse.json();

              // Delete the file
              const deleteResponse = await fetch(url, {
                method: 'DELETE',
                headers: {
                  Authorization: `token ${GITEA_ADMIN_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  sha: fileData.sha,
                  message: `Delete ${file.path}`,
                  branch: tempBranchName,
                  ...(author && { author }),
                }),
              });

              if (!deleteResponse.ok) {
                throw new Error(`Failed to delete ${file.path}`);
              }
            }
          } else {
            // For both create and update
            let sha: string | undefined;

            // Always try to get existing file SHA from the temp branch
            const getResponse = await fetch(`${url}?ref=${tempBranchName}`, {
              headers: {
                Authorization: `token ${GITEA_ADMIN_TOKEN}`,
              },
            });

            if (getResponse.ok) {
              const fileData = await getResponse.json();
              sha = fileData.sha;
              console.log(`File ${file.path} exists on temp branch with SHA: ${sha}`);
            } else {
              console.log(`File ${file.path} does not exist on temp branch (status: ${getResponse.status}), will create it`);
            }
            // If file doesn't exist on temp branch, sha will be undefined (which is correct for new files)

            // Create or update the file
            const response = await fetch(url, {
              method: 'PUT',
              headers: {
                Authorization: `token ${GITEA_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: Buffer.from(file.content).toString('base64'),
                message: `${sha ? 'Update' : 'Add'} ${file.path}`,
                branch: tempBranchName,
                ...(sha && { sha }),
                ...(author && { author }),
              }),
            });

            if (!response.ok) {
              const error = await response.text();
              console.error(`Failed to ${sha ? 'update' : 'create'} ${file.path}:`, error);
              throw new Error(`Failed to ${sha ? 'update' : 'create'} ${file.path}: ${error}`);
            }
          }

          results.push({ path: file.path, success: true });
        } catch (error) {
          console.error(`Error committing ${file.path}:`, error);
          throw error; // Fail fast - if any file fails, abort
        }
      }

      // Step 4: Create a pull request and merge it with squash
      const prUrl = `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`;
      const prResponse = await fetch(prUrl, {
        method: 'POST',
        headers: {
          Authorization: `token ${GITEA_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: message,
          head: tempBranchName,
          base: branch,
          body: `Automated commit: ${message}`,
        }),
      });

      if (!prResponse.ok) {
        throw new Error('Failed to create pull request');
      }

      const prData = await prResponse.json();
      const prNumber = prData.number;

      // Step 5: Merge the PR with squash
      const mergeUrl = `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}/merge`;
      const mergeResponse = await fetch(mergeUrl, {
        method: 'POST',
        headers: {
          Authorization: `token ${GITEA_ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Do: 'squash',
          merge_message_field: message,
          delete_branch_after_merge: true,
        }),
      });

      if (!mergeResponse.ok) {
        const error = await mergeResponse.text();
        // Try to clean up the branch
        await this.deleteBranch(owner, repo, tempBranchName);
        throw new Error(`Failed to merge: ${error}`);
      }

      return {
        success: true,
        results,
      };
    } catch (error) {
      // Clean up temporary branch on error
      try {
        await this.deleteBranch(owner, repo, tempBranchName);
      } catch (cleanupError) {
        console.error('Failed to cleanup temp branch:', cleanupError);
      }
      throw error;
    }
  },

  async deleteBranch(owner: string, repo: string, branch: string) {
    const url = `${GITEA_API_URL}/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`;
    await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `token ${GITEA_ADMIN_TOKEN}`,
      },
    });
  },
};
