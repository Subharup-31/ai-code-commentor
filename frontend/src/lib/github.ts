export interface GithubRepo {
    name: string;
    full_name: string;
    clone_url: string;
    private: boolean;
    default_branch: string;
}

export async function fetchUserRepos(accessToken: string): Promise<GithubRepo[]> {
    if (!accessToken) {
        throw new Error("No access token provided");
    }

    const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
    }

    const data = await response.json();

    return data.map((repo: any) => ({
        name: repo.name,
        full_name: repo.full_name,
        clone_url: repo.clone_url,
        private: repo.private,
        default_branch: repo.default_branch,
    }));
}
