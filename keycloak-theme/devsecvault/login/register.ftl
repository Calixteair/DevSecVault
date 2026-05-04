<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('firstName','lastName','email','username','password','password-confirm','termsAccepted') displayInfo=true; section>
    <#if section = "header">
        ${msg("registerTitle")!"Create your account"}
    <#elseif section = "form">
        <form id="kc-register-form" action="${url.registrationAction}" method="post">

            <div class="dsv-field">
                <label for="firstName" class="dsv-label">${msg("firstName")}</label>
                <div class="dsv-input-wrapper">
                    <svg class="dsv-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input tabindex="1" type="text" id="firstName" name="firstName"
                           value="${(register.formData.firstName!'')}"
                           autocomplete="given-name"
                           class="dsv-input" placeholder="${msg("firstName")}"
                           aria-invalid="<#if messagesPerField.existsError('firstName')>true</#if>" />
                </div>
                <#if messagesPerField.existsError('firstName')>
                    <span class="dsv-error">${kcSanitize(messagesPerField.get('firstName'))?no_esc}</span>
                </#if>
            </div>

            <div class="dsv-field">
                <label for="lastName" class="dsv-label">${msg("lastName")}</label>
                <div class="dsv-input-wrapper">
                    <svg class="dsv-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input tabindex="2" type="text" id="lastName" name="lastName"
                           value="${(register.formData.lastName!'')}"
                           autocomplete="family-name"
                           class="dsv-input" placeholder="${msg("lastName")}"
                           aria-invalid="<#if messagesPerField.existsError('lastName')>true</#if>" />
                </div>
                <#if messagesPerField.existsError('lastName')>
                    <span class="dsv-error">${kcSanitize(messagesPerField.get('lastName'))?no_esc}</span>
                </#if>
            </div>

            <div class="dsv-field">
                <label for="email" class="dsv-label">${msg("email")}</label>
                <div class="dsv-input-wrapper">
                    <svg class="dsv-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    <input tabindex="3" type="email" id="email" name="email"
                           value="${(register.formData.email!'')}"
                           autocomplete="email"
                           class="dsv-input" placeholder="user@example.com"
                           aria-invalid="<#if messagesPerField.existsError('email')>true</#if>" />
                </div>
                <#if messagesPerField.existsError('email')>
                    <span class="dsv-error">${kcSanitize(messagesPerField.get('email'))?no_esc}</span>
                </#if>
            </div>

            <#if !realm.registrationEmailAsUsername>
                <div class="dsv-field">
                    <label for="username" class="dsv-label">${msg("username")}</label>
                    <div class="dsv-input-wrapper">
                        <svg class="dsv-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        <input tabindex="4" type="text" id="username" name="username"
                               value="${(register.formData.username!'')}"
                               autocomplete="username"
                               class="dsv-input" placeholder="${msg("username")}"
                               aria-invalid="<#if messagesPerField.existsError('username')>true</#if>" />
                    </div>
                    <#if messagesPerField.existsError('username')>
                        <span class="dsv-error">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
                    </#if>
                </div>
            </#if>

            <#if passwordRequired??>
                <div class="dsv-field">
                    <label for="password" class="dsv-label">${msg("password")}</label>
                    <div class="dsv-input-wrapper">
                        <svg class="dsv-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <input tabindex="5" type="password" id="password" name="password"
                               autocomplete="new-password"
                               class="dsv-input" placeholder="••••••••"
                               aria-invalid="<#if messagesPerField.existsError('password','password-confirm')>true</#if>" />
                    </div>
                    <#if messagesPerField.existsError('password')>
                        <span class="dsv-error">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                    </#if>
                </div>

                <div class="dsv-field">
                    <label for="password-confirm" class="dsv-label">${msg("passwordConfirm")}</label>
                    <div class="dsv-input-wrapper">
                        <svg class="dsv-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <input tabindex="6" type="password" id="password-confirm" name="password-confirm"
                               autocomplete="new-password"
                               class="dsv-input" placeholder="••••••••"
                               aria-invalid="<#if messagesPerField.existsError('password-confirm')>true</#if>" />
                    </div>
                    <#if messagesPerField.existsError('password-confirm')>
                        <span class="dsv-error">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
                    </#if>
                </div>
            </#if>

            <#if altchaRequired??>
                <div class="dsv-field dsv-altcha">
                    <altcha-widget
                        challenge="${altchaChallengeJson}"
                        name="altcha"
                        auto="onsubmit"
                        hidefooter
                        hidelogo>
                    </altcha-widget>
                    <#if messagesPerField.existsError('altcha')>
                        <span class="dsv-error">${kcSanitize(messagesPerField.get('altcha'))?no_esc}</span>
                    </#if>
                </div>
                <script src="${url.resourcesPath}/js/altcha.min.js" defer></script>
            </#if>

            <div class="dsv-field dsv-terms">
                <div class="dsv-checkbox dsv-checkbox--block">
                    <input tabindex="7" type="checkbox" id="terms"
                           name="user.attributes.acceptedTerms" value="true" required
                           aria-invalid="<#if messagesPerField.existsError('termsAccepted')>true</#if>" />
                    <label for="terms">
                        ${msg("acceptTerms")!"J'accepte les"}
                        <a href="https://vault.calixteair.fr/legal/terms" target="_blank" rel="noopener" class="dsv-link">${msg("termsTitle")!"CGU"}</a>
                        ${msg("acceptTermsAnd")!"et la"}
                        <a href="https://vault.calixteair.fr/legal/privacy" target="_blank" rel="noopener" class="dsv-link">${msg("privacyTitle")!"politique de confidentialité"}</a>
                    </label>
                </div>
                <#if messagesPerField.existsError('termsAccepted')>
                    <span class="dsv-error">${kcSanitize(messagesPerField.get('termsAccepted'))?no_esc}</span>
                </#if>
            </div>

            <button tabindex="8" type="submit" class="dsv-btn">
                ${msg("doRegister")}
            </button>
        </form>
    <#elseif section = "info">
        <div class="dsv-register">
            ${msg("backToLogin")!"Déjà un compte ?"}
            <a href="${url.loginUrl}" class="dsv-link">${msg("doLogIn")}</a>
        </div>
    </#if>
</@layout.registrationLayout>
