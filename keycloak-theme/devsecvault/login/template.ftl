<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${msg("loginTitle",(realm.displayName!''))}</title>
    <link rel="icon" href="${url.resourcesPath}/img/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <#if authenticationSession??>
        <script type="module">
            import { checkAuthSession } from "${url.resourcesPath}/../../../resources/js/authChecker.js";
            checkAuthSession("${authenticationSession.authSessionIdHash}");
        </script>
    </#if>
</head>
<body class="dsv-body">
    <div class="dsv-container">
        <!-- Left side - Features -->
        <div class="dsv-left">
            <div class="dsv-left-content">
                <div class="dsv-brand">
                    <svg class="dsv-shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                    </svg>
                    <h1 class="dsv-title">DevSec Vault</h1>
                </div>
                <p class="dsv-subtitle">A decentralized workstation for developers and cybersecurity experts</p>

                <div class="dsv-features">
                    <div class="dsv-feature">
                        <div class="dsv-feature-icon dsv-feature-icon--primary">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="dsv-feature-title">Dev Library</h3>
                            <p class="dsv-feature-desc">Store and manage code snippets with template variables</p>
                        </div>
                    </div>

                    <div class="dsv-feature">
                        <div class="dsv-feature-icon dsv-feature-icon--accent">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="dsv-feature-title">Cyber Toolbox</h3>
                            <p class="dsv-feature-desc">Generate commands for recon, privilege escalation, and exploitation</p>
                        </div>
                    </div>

                    <div class="dsv-feature">
                        <div class="dsv-feature-icon dsv-feature-icon--destructive">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m21 2-2 2m-7.73 7.73-2.52 2.52a1 1 0 0 1-.71.3H6v-2.04a1 1 0 0 1 .29-.71l2.53-2.52m5.45-5.45 2.52-2.52a1 1 0 0 1 1.42 0l2.04 2.04a1 1 0 0 1 0 1.41l-2.52 2.53m-5.45-5.46 5.45 5.45"/>
                                <path d="M7 20.662V20c0-1.1.9-2 2-2h.5m4.5 0h.5c1.1 0 2 .9 2 2v.662"/>
                            </svg>
                        </div>
                        <div>
                            <h3 class="dsv-feature-title">Secure Bridge</h3>
                            <p class="dsv-feature-desc">Encrypted one-time transfer with burn-after-reading</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right side - Login form -->
        <div class="dsv-right">
            <div class="dsv-form-wrapper">
                <div class="dsv-card">
                    <div class="dsv-card-header">
                        <div class="dsv-lock-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        </div>
                        <h2 class="dsv-card-title"><#nested "header"></h2>
                        <p class="dsv-card-subtitle">Sign in to access your vault</p>
                    </div>

                    <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                        <div class="dsv-alert dsv-alert--${message.type}">
                            ${kcSanitize(message.summary)?no_esc}
                        </div>
                    </#if>

                    <#nested "form">

                    <#if auth?has_content && auth.showTryAnotherWayLink()>
                        <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post">
                            <input type="hidden" name="tryAnotherWay" value="on"/>
                            <a href="#" id="try-another-way" class="dsv-link"
                               onclick="document.forms['kc-select-try-another-way-form'].requestSubmit();return false;">${msg("doTryAnotherWay")}</a>
                        </form>
                    </#if>

                    <#nested "socialProviders">

                    <#if displayInfo>
                        <div class="dsv-info">
                            <#nested "info">
                        </div>
                    </#if>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
</#macro>
