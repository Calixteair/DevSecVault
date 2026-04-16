<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "header">
        Welcome Back
    <#elseif section = "form">
        <#if realm.password>
            <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                <#if !usernameHidden??>
                    <div class="dsv-field">
                        <label for="username" class="dsv-label">
                            <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>Email Address</#if>
                        </label>
                        <div class="dsv-input-wrapper">
                            <svg class="dsv-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                            </svg>
                            <input tabindex="2" id="username" name="username" value="${(login.username!'')}" type="text" autofocus
                                   autocomplete="username"
                                   class="dsv-input" placeholder="user@example.com"
                                   aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                        </div>
                        <#if messagesPerField.existsError('username','password')>
                            <span class="dsv-error">${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}</span>
                        </#if>
                    </div>
                </#if>

                <div class="dsv-field">
                    <label for="password" class="dsv-label">Password</label>
                    <div class="dsv-input-wrapper">
                        <svg class="dsv-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <input tabindex="3" id="password" name="password" type="password" autocomplete="current-password"
                               class="dsv-input" placeholder="••••••••"
                               aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>" />
                    </div>
                </div>

                <div class="dsv-form-options">
                    <#if realm.rememberMe && !usernameHidden??>
                        <div class="dsv-checkbox">
                            <#if login.rememberMe??>
                                <input tabindex="5" id="rememberMe" name="rememberMe" type="checkbox" checked>
                            <#else>
                                <input tabindex="5" id="rememberMe" name="rememberMe" type="checkbox">
                            </#if>
                            <label for="rememberMe">${msg("rememberMe")}</label>
                        </div>
                    </#if>
                    <#if realm.resetPasswordAllowed>
                        <a tabindex="6" href="${url.loginResetCredentialsUrl}" class="dsv-link">${msg("doForgotPassword")}</a>
                    </#if>
                </div>

                <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
                <button tabindex="7" name="login" id="kc-login" type="submit" class="dsv-btn">
                    Login to Vault
                </button>
            </form>
        </#if>
    <#elseif section = "info">
        <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
            <div class="dsv-register">
                ${msg("noAccount")} <a href="${url.registrationUrl}" class="dsv-link">${msg("doRegister")}</a>
            </div>
        </#if>
    <#elseif section = "socialProviders">
        <#if realm.password && social?? && social.providers?has_content>
            <div class="dsv-social">
                <div class="dsv-divider"><span>or continue with</span></div>
                <div class="dsv-social-buttons">
                    <#list social.providers as p>
                        <a href="${p.loginUrl}" class="dsv-social-btn">
                            <#if p.iconClasses?has_content><i class="${p.iconClasses!}"></i></#if>
                            ${p.displayName!}
                        </a>
                    </#list>
                </div>
            </div>
        </#if>
    </#if>
</@layout.registrationLayout>
