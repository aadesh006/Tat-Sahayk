# Tat-Sahayk Production Deployment

This runbook deploys the complete Tat-Sahayk prototype with Docker
Compose:

- React frontend served by Nginx
- FastAPI backend
- PostgreSQL with PostGIS
- Local Python ML service
- Optional AWS Bedrock and S3 integrations

The production stack is defined in
`docker-compose.production.yml`. Only the frontend publishes a host
port. Nginx proxies API and local-media requests to the internal
backend service.

## 1. Deployment assumptions

The target host needs:

- Docker Engine with the Docker Compose v2 plugin
- Git
- Python 3.11 or newer for the deployment policy check
- Persistent disk capacity for PostgreSQL, local uploads, and ML
  model caches
- A firewall and a TLS-terminating reverse proxy or cloud load
  balancer for an internet-facing deployment

Do not expose PostgreSQL, the backend, or the ML service directly to
the internet.

## 2. Prepare the environment

From the repository root:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Generate independent secrets:

```bash
openssl rand -hex 32
openssl rand -hex 24
```

Use the first value as `SECRET_KEY`. Use the second value as
`POSTGRES_PASSWORD` and place the same password in `DATABASE_URL`.
Hexadecimal passwords are URL-safe and do not need percent encoding.

At minimum, replace these values in `.env.production`:

```dotenv
POSTGRES_PASSWORD=<generated-database-password>
DATABASE_URL=postgresql+psycopg2://tat_sahayk:<generated-database-password>@db:5432/tat_sahayk
SECRET_KEY=<generated-application-secret>
CORS_ORIGINS=https://your-real-domain.example
```

The `.env.production` file is intentionally ignored by Git. Never
commit it.

## 3. Select AI and media providers

### AI provider modes

| Mode | Required configuration | Runtime behavior |
| --- | --- | --- |
| Local only | `AI_PROVIDER=local`, `AI_FALLBACK_ENABLED=false`, `AWS_ENABLED=false` | Every report uses the local ML service. |
| Local with Bedrock fallback | `AI_PROVIDER=local`, `AI_FALLBACK_ENABLED=true`, `AWS_ENABLED=true` | Local ML is primary; Bedrock runs only if local analysis fails. |
| Bedrock only | `AI_PROVIDER=bedrock`, `AI_FALLBACK_ENABLED=false`, `AWS_ENABLED=true` | Every report uses Bedrock. |
| Bedrock with local fallback | `AI_PROVIDER=bedrock`, `AI_FALLBACK_ENABLED=true`, `AWS_ENABLED=true` | Bedrock is primary; local ML runs if Bedrock fails. |
| Hybrid | `AI_PROVIDER=hybrid`, `AWS_ENABLED=true` | Local ML and Bedrock both run. Available results are combined; one provider may supply a partial result if the other fails. |

For Bedrock-backed modes, configure:

```dotenv
AWS_ENABLED=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BEDROCK_MODEL_ID=us.amazon.nova-pro-v1:0
AWS_BEDROCK_TEXT_MODEL_ID=us.amazon.nova-micro-v1:0
```

Use credentials supplied securely to the deployment environment.
When deploying on AWS, prefer a narrowly scoped IAM role over
long-lived access keys.

### Media storage modes

For Docker-managed local storage:

```dotenv
MEDIA_STORAGE_PROVIDER=local
```

Uploads persist in the `uploads_data` named volume and are served
through Nginx at `/uploads`.

For S3:

```dotenv
MEDIA_STORAGE_PROVIDER=s3
AWS_ENABLED=true
AWS_REGION=us-east-1
S3_BUCKET=your-report-media-bucket
```

The current prototype returns direct S3 object URLs. The bucket or
an attached CDN must therefore permit the intended users to read
those objects. Use a dedicated bucket and a least-privilege write
policy for the application.

### Google authentication

Set:

```dotenv
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Add the production origin and callback configuration in the Google
Cloud console. The client ID is embedded into the frontend during
the image build, so rebuild the frontend after changing it.

## 4. Validate before deployment

Run the strict deployment policy check:

```bash
python3 scripts/validate_production_compose.py \
  --env-file .env.production
```

Then confirm Docker Compose can render the configuration:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  config --quiet
```

Do not use `--allow-example-secrets` for a real deployment. That
flag exists only so CI can validate the committed example file.

The strict check verifies:

- required services and named volumes
- frontend-only host port exposure
- production mode with debug and reload disabled
- health checks, restart policies, and bounded logs
- no bind mounts, host networking, or privileged containers
- valid provider combinations
- non-placeholder application and database secrets

## 5. Build and start

Build fresh images:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  build --pull
```

Start the stack:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d
```

The backend startup command applies Alembic migrations before
starting Uvicorn.

Inspect service state:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps
```

The first ML-service startup can take longer while model resources
are initialized.

## 6. Verify health

Verify the public frontend endpoint on the deployment host:

```bash
curl --fail --silent \
  --output /dev/null \
  --write-out "frontend HTTP %{http_code}\n" \
  http://localhost:8080/health
```

Verify the internal backend readiness endpoint:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec -T backend \
  curl --fail --silent http://localhost:5001/health/ready
```

Verify the local ML service:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec -T ml-service \
  curl --fail --silent http://localhost:8000/health
```

Verify PostgreSQL:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec -T db \
  sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

When `AI_PROVIDER=bedrock`, backend readiness deliberately skips the
local ML dependency check. The ML container still remains available
for a later switch to local or hybrid mode.

## 7. Provision the first administrator

Administrator accounts cannot be created through public signup.

Create a district administrator using the interactive password
prompt:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  run --rm backend \
  python scripts/create_admin.py \
  --email admin@agency.gov.in \
  --full-name "District Administrator" \
  --district "Mumbai" \
  --state "Maharashtra"
```

Create a national administrator:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  run --rm backend \
  python scripts/create_admin.py \
  --email national-admin@agency.gov.in \
  --full-name "National Administrator" \
  --national
```

The password must contain at least 12 characters, including an
uppercase letter, lowercase letter, number, and special character.
The script never prints the password.

An existing account is never modified implicitly. To intentionally
convert or update an existing account, repeat the command with
`--update-existing`.

## 8. TLS and network exposure

The Compose stack serves HTTP on `FRONTEND_PORT`, which defaults to
`8080`. For internet access:

1. Put a TLS-terminating reverse proxy or cloud load balancer in
   front of port 8080.
2. Serve the public site only over HTTPS.
3. Restrict direct access to port 8080 with the host or cloud
   firewall.
4. Keep ports 5432, 5001, and 8000 private.
5. Set `CORS_ORIGINS` to the final HTTPS origin.

TLS certificate management is intentionally outside this Compose
file so the same application stack can sit behind Caddy, Nginx, an
AWS Application Load Balancer, or another ingress layer.

## 9. Routine operations

Show service status:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps
```

Follow all logs:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs --follow --tail=200
```

Follow one service:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs --follow --tail=200 backend
```

Restart one service:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  restart backend
```

## 10. Backups

Create a protected local backup directory:

```bash
mkdir -p backups
chmod 700 backups
```

Create a PostgreSQL custom-format backup:

```bash
backup_stamp="$(date -u +%Y%m%dT%H%M%SZ)"

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec -T db \
  sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "backups/database-${backup_stamp}.dump"
```

When using local media storage, copy the upload volume contents:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  cp backend:/app/uploads \
  "backups/uploads-${backup_stamp}"
```

Store backups away from the application host and test restoration
regularly. For S3 media, enable bucket versioning and a suitable
lifecycle or replication policy.

### Database restoration

Restoration replaces application data. Schedule downtime, verify
the backup filename, and take a fresh backup before proceeding.

Stop application traffic:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  stop frontend backend
```

Restore the selected database dump:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec -T db \
  sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  < backups/database-YYYYMMDDTHHMMSSZ.dump
```

Start the application and repeat all health checks:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d backend frontend
```

## 11. Upgrade procedure

Before each upgrade:

1. Record the currently deployed Git commit.
2. Back up PostgreSQL and local uploads.
3. Review changes to `.env.production.example`.
4. Keep the existing `.env.production`; merge new variables into it
   manually.

Validate and deploy the new revision:

```bash
python3 scripts/validate_production_compose.py \
  --env-file .env.production

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  build --pull

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps
```

The backend automatically upgrades the database to the current
Alembic revision.

## 12. Rollback strategy

Application images can be rebuilt from the previously deployed Git
commit. Database migrations may not be backward compatible, so do
not run `alembic downgrade` blindly.

For a rollback:

1. Stop frontend and backend traffic.
2. Return the repository to the recorded deployed commit.
3. Rebuild the previous images.
4. If the release changed the schema incompatibly, restore the
   pre-upgrade database backup.
5. Start the stack and run all health checks.

Practice the backup and rollback procedure before a live event or
demonstration.

## 13. Shutdown

Stop containers without deleting persistent volumes:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  down
```

Do not add `--volumes` unless permanent deletion of the database,
uploads, and ML caches is explicitly intended and verified.

## 14. Troubleshooting

### A service remains unhealthy

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs --tail=200 <service-name>
```

Check `db`, then `ml-service`, then `backend`, and finally
`frontend`, because health dependencies start in that order.

### Backend fails during startup

Inspect migration output:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs --tail=200 backend
```

Verify that `DATABASE_URL` uses `db` as its hostname and contains
the same credentials configured for PostgreSQL.

### Local analysis fails

Check ML health and logs:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec -T ml-service \
  curl --fail --silent http://localhost:8000/health

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs --tail=200 ml-service
```

### Bedrock analysis fails

Confirm `AWS_ENABLED=true`, the region and model IDs are correct,
and the supplied IAM identity can invoke the configured Bedrock
models.

### Uploaded media is unavailable

For local storage, confirm the `uploads_data` volume is mounted and
the backend can write to `/app/uploads`. For S3, confirm bucket
permissions, region, and object-read behavior.
