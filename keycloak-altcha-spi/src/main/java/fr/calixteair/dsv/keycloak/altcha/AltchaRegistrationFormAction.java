package fr.calixteair.dsv.keycloak.altcha;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import org.altcha.altcha.v2.Altcha;
import org.jboss.logging.Logger;
import org.keycloak.Config;
import org.keycloak.authentication.FormAction;
import org.keycloak.authentication.FormActionFactory;
import org.keycloak.authentication.FormContext;
import org.keycloak.authentication.ValidationContext;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.AuthenticationExecutionModel.Requirement;
import org.keycloak.models.AuthenticatorConfigModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.models.RealmModel;
import org.keycloak.models.SingleUseObjectProvider;
import org.keycloak.models.UserModel;
import org.keycloak.models.utils.FormMessage;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.services.messages.Messages;
import org.keycloak.services.validation.Validation;

import java.util.ArrayList;
import java.util.List;

public class AltchaRegistrationFormAction implements FormAction, FormActionFactory {

    private static final Logger LOG = Logger.getLogger(AltchaRegistrationFormAction.class);

    public static final String PROVIDER_ID = "altcha-registration";
    public static final String FORM_FIELD = "altcha";

    public static final String CONFIG_HMAC_SECRET = "hmacSecret";
    public static final String CONFIG_COST = "cost";
    public static final String CONFIG_EXPIRES_IN_SEC = "expiresInSec";
    public static final String CONFIG_ALGORITHM = "algorithm";

    private static final int DEFAULT_COST = 50_000;
    private static final long DEFAULT_EXPIRES_IN_SEC = 600L;
    private static final String DEFAULT_ALGORITHM = "SHA-256";

    @Override
    public String getDisplayType() {
        return "Altcha (proof-of-work)";
    }

    @Override
    public String getReferenceCategory() {
        return "altcha";
    }

    @Override
    public boolean isConfigurable() {
        return true;
    }

    @Override
    public Requirement[] getRequirementChoices() {
        return new Requirement[]{Requirement.REQUIRED, Requirement.DISABLED};
    }

    @Override
    public boolean isUserSetupAllowed() {
        return false;
    }

    @Override
    public String getHelpText() {
        return "Privacy-friendly proof-of-work challenge (Altcha) on the registration form. No cookies, no tracking, no third-party calls.";
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        List<ProviderConfigProperty> props = new ArrayList<>();

        ProviderConfigProperty hmac = new ProviderConfigProperty();
        hmac.setName(CONFIG_HMAC_SECRET);
        hmac.setLabel("HMAC secret");
        hmac.setHelpText("Server-side HMAC secret for signing challenges. Use a 32+ byte random value, ideally injected via environment variable.");
        hmac.setType(ProviderConfigProperty.STRING_TYPE);
        hmac.setSecret(true);
        props.add(hmac);

        ProviderConfigProperty cost = new ProviderConfigProperty();
        cost.setName(CONFIG_COST);
        cost.setLabel("PoW cost");
        cost.setHelpText("Number of iterations the client must brute-force. 50000 is a good default (~500ms desktop, ~1.5s mobile).");
        cost.setType(ProviderConfigProperty.STRING_TYPE);
        cost.setDefaultValue(String.valueOf(DEFAULT_COST));
        props.add(cost);

        ProviderConfigProperty exp = new ProviderConfigProperty();
        exp.setName(CONFIG_EXPIRES_IN_SEC);
        exp.setLabel("Challenge TTL (seconds)");
        exp.setHelpText("How long a challenge is valid before it expires.");
        exp.setType(ProviderConfigProperty.STRING_TYPE);
        exp.setDefaultValue(String.valueOf(DEFAULT_EXPIRES_IN_SEC));
        props.add(exp);

        ProviderConfigProperty algo = new ProviderConfigProperty();
        algo.setName(CONFIG_ALGORITHM);
        algo.setLabel("Hash algorithm");
        algo.setHelpText("SHA-256 (recommended) or SHA-512.");
        algo.setType(ProviderConfigProperty.STRING_TYPE);
        algo.setDefaultValue(DEFAULT_ALGORITHM);
        props.add(algo);

        return props;
    }

    @Override
    public void buildPage(FormContext context, LoginFormsProvider form) {
        Config cfg = Config.from(context);
        try {
            Altcha.CreateChallengeOptions opts = new Altcha.CreateChallengeOptions()
                    .algorithm(cfg.algorithm)
                    .cost(cfg.cost)
                    .hmacSignatureSecret(cfg.hmacSecret)
                    .expiresInSeconds(cfg.expiresInSec);

            Altcha.Challenge challenge = Altcha.createChallenge(opts);

            form.setAttribute("altchaRequired", true);
            form.setAttribute("altchaChallengeJson", challenge.toJson());
        } catch (Exception e) {
            LOG.error("Failed to build Altcha challenge", e);
            form.setError("altchaInternalError");
        }
    }

    @Override
    public void validate(ValidationContext context) {
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        String payload = formData.getFirst(FORM_FIELD);

        if (Validation.isBlank(payload)) {
            errorChallenge(context, "altchaMissing");
            return;
        }

        Config cfg = Config.from(context);

        try {
            Altcha.VerifySolutionResult result = Altcha.verifySolution(
                    payload,
                    cfg.hmacSecret,
                    Altcha.kdf(cfg.algorithm));

            if (result.expired()) {
                errorChallenge(context, "altchaExpired");
                return;
            }
            if (!result.verified()) {
                errorChallenge(context, "altchaInvalid");
                return;
            }

            if (!consumeOnce(context.getSession(), payload, cfg.expiresInSec)) {
                errorChallenge(context, "altchaReplay");
                return;
            }

            context.success();
        } catch (Exception e) {
            LOG.error("Altcha verification failed", e);
            errorChallenge(context, "altchaInternalError");
        }
    }

    private void errorChallenge(ValidationContext context, String messageKey) {
        List<FormMessage> errors = new ArrayList<>();
        errors.add(new FormMessage(FORM_FIELD, messageKey));
        context.error(Messages.RECAPTCHA_FAILED);
        context.validationError(context.getHttpRequest().getDecodedFormParameters(), errors);
        context.excludeOtherErrors();
    }

    private boolean consumeOnce(KeycloakSession session, String payload, long ttlSec) {
        try {
            Altcha.Payload parsed = Altcha.parsePayload(payload);
            String key = "altcha:" + parsed.challenge().signature();
            SingleUseObjectProvider store = session.singleUseObjects();
            return store.putIfAbsent(key, ttlSec);
        } catch (Exception e) {
            LOG.warn("Could not parse Altcha payload for replay check", e);
            return false;
        }
    }

    @Override
    public void success(FormContext context) {
    }

    @Override
    public boolean requiresUser() {
        return false;
    }

    @Override
    public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
        return true;
    }

    @Override
    public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {
    }

    @Override
    public FormAction create(KeycloakSession session) {
        return this;
    }

    @Override
    public void init(org.keycloak.Config.Scope config) {
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
    }

    @Override
    public void close() {
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    private static final class Config {
        final String hmacSecret;
        final int cost;
        final long expiresInSec;
        final String algorithm;

        private Config(String hmacSecret, int cost, long expiresInSec, String algorithm) {
            this.hmacSecret = hmacSecret;
            this.cost = cost;
            this.expiresInSec = expiresInSec;
            this.algorithm = algorithm;
        }

        static Config from(FormContext context) {
            AuthenticatorConfigModel model = context.getAuthenticatorConfig();
            return read(model);
        }

        static Config from(ValidationContext context) {
            AuthenticatorConfigModel model = context.getAuthenticatorConfig();
            return read(model);
        }

        private static Config read(AuthenticatorConfigModel model) {
            String secret = envOr(getOrNull(model, CONFIG_HMAC_SECRET), "ALTCHA_HMAC_SECRET");
            if (secret == null || secret.isBlank()) {
                throw new IllegalStateException("Altcha hmacSecret is not configured (set in execution config or env ALTCHA_HMAC_SECRET)");
            }
            int cost = parseInt(getOrNull(model, CONFIG_COST), DEFAULT_COST);
            long ttl = parseLong(getOrNull(model, CONFIG_EXPIRES_IN_SEC), DEFAULT_EXPIRES_IN_SEC);
            String algo = orDefault(getOrNull(model, CONFIG_ALGORITHM), DEFAULT_ALGORITHM);
            return new Config(secret, cost, ttl, algo);
        }

        private static String getOrNull(AuthenticatorConfigModel model, String key) {
            return model == null ? null : model.getConfig().get(key);
        }

        private static String envOr(String configValue, String envVar) {
            if (configValue != null && !configValue.isBlank()) return configValue;
            String env = System.getenv(envVar);
            return env != null && !env.isBlank() ? env : null;
        }

        private static int parseInt(String s, int fallback) {
            try { return s == null || s.isBlank() ? fallback : Integer.parseInt(s.trim()); }
            catch (NumberFormatException e) { return fallback; }
        }

        private static long parseLong(String s, long fallback) {
            try { return s == null || s.isBlank() ? fallback : Long.parseLong(s.trim()); }
            catch (NumberFormatException e) { return fallback; }
        }

        private static String orDefault(String s, String fallback) {
            return s == null || s.isBlank() ? fallback : s.trim();
        }
    }
}
