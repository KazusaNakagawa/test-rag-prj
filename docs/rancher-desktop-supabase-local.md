# Supabase CLI on Rancher Desktop (macOS)

This note captures how we got `supabase start` working with Rancher Desktop.

## Symptoms
- `supabase_vector_*` container stays `unhealthy`
- Vector logs show: `Listing currently running containers failed` and
  `Connection refused (os error 111)`

## Root cause
- `supabase_vector` tries to read Docker logs via the Docker socket.
- With Rancher Desktop, the Docker socket is not exposed at
  `/var/run/docker.sock` by default.

## Fix 1: Point /var/run/docker.sock at Rancher Desktop socket

1. Confirm Rancher Desktop is using Docker (moby).
2. Create a symlink for the Docker socket:
   ```bash
   ls -l ~/.rd/docker.sock
   ls -l /var/run/docker.sock
   sudo ln -s ~/.rd/docker.sock /var/run/docker.sock
   ```
3. Restart Supabase:
   ```bash
   supabase stop
   supabase start
   ```

## Fix 2 (workaround): Disable analytics to skip vector

If vector still fails, disable analytics locally to avoid the vector container.

```bash
cat <<'EOF' > supabase/config.toml
[analytics]
enabled = false
EOF

supabase stop
supabase start
```

## Notes
- Do not check secrets into git if you copy CLI output into docs.
- Rancher Desktop settings may differ by version; if Docker socket exposure
  is available in the UI, enable it instead of using a symlink.
