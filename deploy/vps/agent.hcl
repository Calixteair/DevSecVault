pid_file = "/run/devsecvault/bao-agent.pid"

vault {
  address = "http://127.0.0.1:8200"
}

auto_auth {
  method "approle" {
    config = {
      role_id_file_path                   = "/etc/bao/devsecvault/role_id"
      secret_id_file_path                 = "/etc/bao/devsecvault/secret_id"
      remove_secret_id_file_after_reading = false
    }
  }

  sink "file" {
    config = {
      path = "/run/devsecvault/.bao-token"
      mode = 0600
    }
  }
}

template_config {
  exit_on_retry_failure         = true
  static_secret_render_interval = "1h"
}

template {
  destination = "/run/devsecvault/.env"
  perms       = 0600
  contents    = <<EOT
{{ with secret "secret/data/devsecvault/prod/db" }}
POSTGRES_DB={{ .Data.data.POSTGRES_DB }}
POSTGRES_USER={{ .Data.data.POSTGRES_USER }}
POSTGRES_PASSWORD={{ .Data.data.POSTGRES_PASSWORD }}
{{ end }}
{{ with secret "secret/data/devsecvault/prod/app" }}
APP_ENV={{ .Data.data.APP_ENV }}
APP_SECRET={{ .Data.data.APP_SECRET }}
DOCKERHUB_USERNAME={{ .Data.data.DOCKERHUB_USERNAME }}
MAILER_DSN={{ .Data.data.MAILER_DSN }}
REPORT_NOTIFY_FROM={{ .Data.data.REPORT_NOTIFY_FROM }}
REPORT_NOTIFY_TO={{ .Data.data.REPORT_NOTIFY_TO }}
APP_PUBLIC_URL={{ .Data.data.APP_PUBLIC_URL }}
REPORT_IP_HASH_SALT={{ .Data.data.REPORT_IP_HASH_SALT }}
{{ end }}
{{ with secret "secret/data/devsecvault/prod/meili" }}
MEILI_MASTER_KEY={{ .Data.data.MEILI_MASTER_KEY }}
{{ end }}
{{ with secret "secret/data/devsecvault/prod/keycloak" }}
KEYCLOAK_REALM={{ .Data.data.KEYCLOAK_REALM }}
KEYCLOAK_CLIENT_ID={{ .Data.data.KEYCLOAK_CLIENT_ID }}
KEYCLOAK_CLIENT_SECRET={{ .Data.data.KEYCLOAK_CLIENT_SECRET }}
{{ end }}
EOT
}

template {
  destination = "/run/devsecvault/prod.decrypt.private.php"
  perms       = 0644
  contents    = "{{ with secret \"secret/data/devsecvault/prod/decrypt\" }}{{ .Data.data.PROD_DECRYPT_PRIVATE_PHP_B64 | base64Decode | trimSpace }}{{ end }}"
}
