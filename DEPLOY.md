# Deploying the portfolio

```
git push (master) ──▶ GitHub Actions ──▶ S3 bucket ──▶ CloudFront E3CIEJVE4HXEXB (cache cleared) ──▶ live
```

`.github/workflows/deploy.yml` runs on **every push to `master`**, and on demand from any
branch you pick in GitHub's branch selector (see [Deploying a specific branch](#deploying-a-specific-branch)).

Each run:

1. checks the site files and syntax-checks `index.js` (a broken build never reaches S3),
2. logs in to AWS,
3. removes `.git/` and `.github/` from the bucket (older deploys uploaded them publicly),
4. uploads `fonts/` with a 1-year cache, then everything else with an always-revalidate cache,
   deleting from the bucket anything you deleted locally,
5. invalidates CloudFront so the new version is live immediately.

**Uploaded:** `index.html`, `index.css`, `index.js`, `fonts/`, `MohdSakib_Resume.pdf`.
**Never uploaded:** `.git/`, `.github/`, `.gitignore`, `*.md` (this file).

## Deploying a specific branch

GitHub → **Actions** → **Deploy portfolio to S3** → **Run workflow** →
**Use workflow from: `<branch>`** → **Run workflow**.

That branch's code goes to S3 and replaces the live site. To go back, run it again from
`master`. A push to `master` also redeploys `master` automatically.

**The branch must contain `.github/workflows/deploy.yml`.** GitHub runs the workflow file from
the branch you select; if it isn't there, the run fails with *"Workflow does not exist or does
not have a workflow_dispatch trigger in this branch"*.

- Branches you create from `master` after the merge below already have it.
- Older branches need it copied in once, then pushed:

  ```bash
  git checkout dev                                      # repeat for dev-v2, etc.
  git checkout master -- .github/workflows/deploy.yml   # copy the file from master
  git commit -m "Add S3 deploy workflow"
  git push -u origin dev
  ```

- The branch must be pushed to GitHub before it appears in the **Use workflow from** list.

## It uses your existing setup

No AWS changes are needed. The workflow reads the same repository secrets your old workflow used:

| Secret | Used for |
|---|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS login (until you switch to OIDC, below) |
| `AWS_REGION` | Bucket region |
| `S3_BUCKET` | Bucket name |

The CloudFront distribution defaults to `E3CIEJVE4HXEXB`. To use another one, add a repository
**variable** `CLOUDFRONT_DISTRIBUTION_ID`.

## Ship it (first time)

Your redesign is uncommitted on `dev-v3`, and `master` still has the old site and the old
workflow. Commit, merge into `master`, push:

```bash
cd "/Users/mohdsakib/Desktop/my_projects/Sakib /sakib_backend/myportfolio/portfolio"

git checkout dev-v3
git add -A
git commit -m "Portfolio v2 redesign + S3 deploy pipeline"

git checkout master
git pull origin master
git merge dev-v3
```

The merge stops on **one expected conflict**: both branches contain `.github/workflows/deploy.yml`.
Keep the new one from `dev-v3`:

```bash
git checkout --theirs .github/workflows/deploy.yml
git add .github/workflows/deploy.yml
git commit --no-edit
git push origin master
```

Open the repo's **Actions** tab and watch **Deploy portfolio to S3**. When it's green, open your
CloudFront URL (or custom domain).

From then on: commit to `master` (or merge a branch into it) → push → live in about a minute.

## Permissions the deploy needs

If a run fails with `AccessDenied`, the IAM user (or role) needs at least this policy. Replace
`<BUCKET>` and `<ACCOUNT_ID>`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::<BUCKET>"
    },
    {
      "Sid": "WriteSiteFiles",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<BUCKET>/*"
    },
    {
      "Sid": "InvalidateCdn",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/E3CIEJVE4HXEXB"
    }
  ]
}
```

## Recommended upgrade: OIDC instead of access keys

Access keys stored in GitHub never expire, so a leak stays dangerous until someone notices.
With OIDC, GitHub gets 1-hour AWS credentials per run and nothing secret is stored. The workflow
switches over automatically as soon as the `AWS_ROLE_ARN` variable exists.

1. **IAM → Identity providers → Add provider → OpenID Connect**
   Provider URL `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
   Skip this if it's already listed.
2. **IAM → Roles → Create role → Custom trust policy**:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:MohdSakib535/portfolio:ref:refs/heads/*"
           }
         }
       }
     ]
   }
   ```

   Workflows on any branch of this repo can use the role, which you need because you deploy
   from the branch you pick. Forks and other repos can't. To allow only certain branches, replace
   the `*` value with a list, e.g. `["repo:MohdSakib535/portfolio:ref:refs/heads/master",
   "repo:MohdSakib535/portfolio:ref:refs/heads/dev-v3"]`.
3. Name it `github-actions-portfolio-deploy`, then **Add permissions → Create inline policy** with
   the JSON from [Permissions the deploy needs](#permissions-the-deploy-needs). Copy the role ARN.
4. GitHub → **Settings → Secrets and variables → Actions → Variables** → add
   `AWS_ROLE_ARN` = the role ARN.
5. Run the workflow once to confirm. The log shows **Configure AWS credentials (OIDC role)** running
   and the access-keys step skipped.
6. Delete the `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` secrets, then deactivate and delete
   that access key in IAM.

## How caching is set up

| Files | Cache-Control | Why |
|---|---|---|
| `fonts/*.woff2` | `max-age=31536000, immutable` | Never change; browsers keep them for a year |
| everything else | `max-age=0, s-maxage=86400, must-revalidate` | Same filenames every deploy, so browsers always check for a new version (cheap 304s). CloudFront keeps a copy for a day; every deploy invalidates it. |

If you ever replace a font file, give it a new name (e.g. `Inter-v2.woff2`) and update
`index.css`. Otherwise returning visitors keep the old font for up to a year.

## Troubleshooting

| Error | Fix |
|---|---|
| `Repository secret … is not set` | Settings → Secrets and variables → Actions: check `S3_BUCKET` / `AWS_REGION` exist |
| `The security token included in the request is invalid` | Access key deleted or rotated: update the two key secrets, or switch to OIDC |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | OIDC trust policy `sub` must match `repo:MohdSakib535/portfolio:ref:refs/heads/<branch you ran from>` |
| `Workflow does not exist or does not have a workflow_dispatch trigger in this branch` | That branch doesn't contain `.github/workflows/deploy.yml`; see [Deploying a specific branch](#deploying-a-specific-branch) |
| `AccessDenied` during `s3 sync` or `s3 rm` | Add the policy from [Permissions the deploy needs](#permissions-the-deploy-needs) |
| `AccessDenied` on `CreateInvalidation` | Distribution ID in the policy doesn't match `E3CIEJVE4HXEXB` / your variable |
| Site shows the old version | Hard-refresh (Cmd+Shift+R); check the run's **Invalidate CloudFront cache** step succeeded |
| Workflow doesn't start on push | It only runs from `master`; the workflow file must be on `master` |
